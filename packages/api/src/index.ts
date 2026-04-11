import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const port = process.env.API_PORT || 3001;

// Helper: Calculate date ranges
const getDateRange = (period: string, start_date?: string, end_date?: string) => {
  const now = new Date();
  let start = new Date(0); // Epoch
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (start_date && end_date) {
    return { start: new Date(start_date), end: new Date(end_date) };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      start = today;
      break;
    case 'week':
    case '7days':
      start = new Date(today);
      start.setDate(today.getDate() - 7);
      break;
    case '14days':
      start = new Date(today);
      start.setDate(today.getDate() - 14);
      break;
    case '30days':
      start = new Date(today);
      start.setDate(today.getDate() - 30);
      break;
    case '90days':
      start = new Date(today);
      start.setDate(today.getDate() - 90);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'lastmonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'all':
      start = new Date(0);
      break;
  }
  return { start, end };
};

// Helper: Sync monthly bills from fixed expenses and installments
const syncMonthlyBills = async (user_id: string, month: number, year: number) => {
  // Check if bills already exist for this month/year
  const { data: existing } = await supabase
    .from('monthly_bills')
    .select('id')
    .eq('user_id', user_id)
    .eq('month', month)
    .eq('year', year)
    .limit(1);

  if (existing && existing.length > 0) return;

  // Fetch fixed expenses
  const { data: fixed } = await supabase
    .from('fixed_expenses')
    .select('*')
    .eq('user_id', user_id)
    .eq('active', true);

  // Fetch installments
  const { data: installments } = await supabase
    .from('installments')
    .select('*')
    .eq('user_id', user_id)
    .eq('active', true);

  const billsToInsert = [];

  if (fixed) {
    fixed.forEach(f => {
      billsToInsert.push({
        user_id,
        name: f.name,
        value: f.value,
        due_day: f.due_day,
        category: f.category,
        subtype: 'fixed',
        month,
        year
      });
    });
  }

  if (installments) {
    installments.forEach(i => {
      billsToInsert.push({
        user_id,
        name: i.description,
        value: i.installment_value,
        due_day: i.due_day,
        category: i.category,
        subtype: 'semifixed',
        month,
        year
      });
    });
  }

  if (billsToInsert.length > 0) {
    await supabase.from('monthly_bills').insert(billsToInsert);
  }
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: "ok", app: "Pera" });
});

app.get('/transactions', async (req, res) => {
  try {
    const { user_id, period, start_date, end_date } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { start, end } = getDateRange(period as string, start_date as string, end_date as string);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('occurred_at', start.toISOString())
      .lte('occurred_at', end.toISOString())
      .order('occurred_at', { ascending: false });

    if (error) throw error;

    let total_income = 0;
    let total_expense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') total_income += Number(t.value);
      else total_expense += Number(t.value);
    });

    res.json({
      total_income,
      total_expense,
      balance: total_income - total_expense,
      count: transactions.length,
      transactions
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/transactions/summary', async (req, res) => {
  try {
    const { user_id, period } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { start, end } = getDateRange(period as string);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('occurred_at', start.toISOString())
      .lte('occurred_at', end.toISOString());

    if (error) throw error;

    let total_income = 0;
    let total_expense = 0;
    const by_category: any = {};
    const by_subtype = { fixed: 0, variable: 0, semifixed: 0 };
    const by_urgency = { urgent: 0, planned: 0 };

    transactions.forEach(t => {
      const val = Number(t.value);
      if (t.type === 'income') {
        total_income += val;
      } else {
        total_expense += val;
        // Category breakdown (expenses only)
        if (!by_category[t.category]) by_category[t.category] = { total: 0, count: 0 };
        by_category[t.category].total += val;
        by_category[t.category].count += 1;
        
        // Subtype & Urgency
        if (t.subtype in by_subtype) (by_subtype as any)[t.subtype] += val;
        if (t.urgency in by_urgency) (by_urgency as any)[t.urgency] += val;
      }
    });

    const categoryArray = Object.keys(by_category).map(cat => ({
      category: cat,
      total: by_category[cat].total,
      count: by_category[cat].count,
      percentage: total_expense > 0 ? (by_category[cat].total / total_expense) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    res.json({
      total_income,
      total_expense,
      balance: total_income - total_expense,
      by_category: categoryArray,
      by_subtype,
      by_urgency
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/transactions/frequency', async (req, res) => {
  try {
    const { user_id, period } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { start, end } = getDateRange(period as string);

    const { data, error } = await supabase
      .from('transactions')
      .select('category, value')
      .eq('user_id', user_id)
      .eq('type', 'expense')
      .gte('occurred_at', start.toISOString())
      .lte('occurred_at', end.toISOString());

    if (error) throw error;

    const freq: any = {};
    data.forEach(t => {
      if (!freq[t.category]) freq[t.category] = { total: 0, count: 0 };
      freq[t.category].total += Number(t.value);
      freq[t.category].count += 1;
    });

    const result = Object.keys(freq).map(cat => ({
      category: cat,
      count: freq[cat].count,
      total: freq[cat].total,
      average_per_occurrence: freq[cat].total / freq[cat].count
    })).sort((a,b) => b.count - a.count);

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/installments', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true);

    if (error) throw error;

    const result = data.map(i => {
      const remaining_installments = i.total_installments - i.current_installment + 1;
      return {
        ...i,
        remaining_installments,
        remaining_value: remaining_installments * i.installment_value
      };
    });

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/fixed-expenses', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    
    const { data, error } = await supabase.from('fixed_expenses').select('*').eq('user_id', user_id).eq('active', true);
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/goals', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { data, error } = await supabase.from('goals').select('*').eq('user_id', user_id).eq('active', true);
    if (error) throw error;
    
    const result = data.map(g => ({
      ...g,
      percentage_progress: (g.current_value / g.target_value) * 100
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/budgets', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    // Get budgets
    const { data: budgets, error: bError } = await supabase.from('budgets').select('*').eq('user_id', user_id);
    if (bError) throw bError;

    // Get current month expenses
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: transactions, error: tError } = await supabase
      .from('transactions')
      .select('category, value')
      .eq('user_id', user_id)
      .eq('type', 'expense')
      .gte('occurred_at', startOfMonth);

    if (tError) throw tError;

    const result = budgets.map(b => {
      const spent = transactions
        .filter(t => t.category === b.category)
        .reduce((sum, t) => sum + Number(t.value), 0);
      return {
        ...b,
        spent,
        percentage_used: (spent / b.monthly_limit) * 100
      };
    });

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/bill-due-dates', async (req, res) => {
  try {
    const { user_id, name, due_day, category, estimated_value } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { data, error } = await supabase.from('bill_due_dates').insert({
      user_id, name, due_day, category, estimated_value
    }).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/bill-due-dates', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { data, error } = await supabase
      .from('bill_due_dates')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true)
      .order('due_day', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/monthly-bills', async (req, res) => {
  try {
    const { user_id, month, year } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    
    const now = new Date();
    const m = month ? parseInt(month as string) : now.getMonth() + 1;
    const y = year ? parseInt(year as string) : now.getFullYear();

    // Trigger sync for current or future months
    if (y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth() + 1)) {
      await syncMonthlyBills(user_id as string, m, y);
    }

    const { data, error } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('user_id', user_id)
      .eq('month', m)
      .eq('year', y)
      .order('due_day', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/monthly-bills/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid } = req.body;
    
    const { data, error } = await supabase
      .from('monthly_bills')
      .update({ 
        paid: paid ?? true, 
        paid_at: (paid ?? true) ? new Date().toISOString() : null 
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`API Pera rodando na porta ${port}`);
});
