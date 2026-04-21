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
  const TIMEZONE_OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3 Brasil

  // Calculate "now" and "today" in Brazil time (UTC - 3h)
  const nowBrazil = new Date(now.getTime() + TIMEZONE_OFFSET_MS);
  const todayBrazil = new Date(nowBrazil.getFullYear(), nowBrazil.getMonth(), nowBrazil.getDate());

  // Convert back to UTC for database queries (Local + 3h)
  const todayStartUTC = new Date(todayBrazil.getTime() - TIMEZONE_OFFSET_MS);
  const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

  if (start_date && end_date) {
    return { start: new Date(start_date), end: new Date(end_date) };
  }

  let start = new Date(0); // Epoch
  let end = todayEndUTC;

  switch (period) {
    case 'today':
      start = todayStartUTC;
      end = todayEndUTC;
      break;
    case 'yesterday':
      start = new Date(todayStartUTC.getTime() - 24 * 60 * 60 * 1000);
      end = new Date(todayStartUTC.getTime() - 1);
      break;
    case 'week':
    case '7days':
      start = new Date(todayStartUTC);
      start.setDate(start.getDate() - 7);
      break;
    case '14days':
      start = new Date(todayStartUTC);
      start.setDate(start.getDate() - 14);
      break;
    case '30days':
      start = new Date(todayStartUTC);
      start.setDate(start.getDate() - 30);
      break;
    case '90days':
      start = new Date(todayStartUTC);
      start.setDate(start.getDate() - 90);
      break;
    case 'month':
      const firstDayBrazil = new Date(nowBrazil.getFullYear(), nowBrazil.getMonth(), 1);
      start = new Date(firstDayBrazil.getTime() - TIMEZONE_OFFSET_MS);
      break;
    case 'lastmonth':
      const firstMonthBR = new Date(nowBrazil.getFullYear(), nowBrazil.getMonth() - 1, 1);
      const lastDayLastMonthBR = new Date(nowBrazil.getFullYear(), nowBrazil.getMonth(), 0, 23, 59, 59, 999);
      start = new Date(firstMonthBR.getTime() - TIMEZONE_OFFSET_MS);
      end = new Date(lastDayLastMonthBR.getTime() - TIMEZONE_OFFSET_MS);
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

app.post('/transactions', async (req, res) => {
  try {
    const { user_id, value, type, category, subtype, urgency, 
            description, source, short_code, subcategory } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id, value, type, category, subtype, urgency,
        description, source, short_code, subcategory: subcategory || null
      })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value, category, subcategory, counts_for_tithe } = req.body;
    const updates: any = {};
    if (value !== undefined) updates.value = value;
    if (category !== undefined) updates.category = category;
    if ('subcategory' in req.body) updates.subcategory = subcategory;
    if ('counts_for_tithe' in req.body) updates.counts_for_tithe = counts_for_tithe;
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
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
      const remaining_installments = i.total_installments - i.current_installment;
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

app.get('/monthly-bills-all', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Sync mês atual
    await syncMonthlyBills(user_id as string, currentMonth, currentYear);

    // Buscar TODAS as bills não pagas (qualquer mês/ano)
    const { data: unpaidAll, error: e1 } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('user_id', user_id)
      .eq('paid', false)
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .order('due_day', { ascending: true });

    if (e1) throw e1;

    // Buscar bills pagas apenas do mês atual
    const { data: paidCurrent, error: e2 } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('user_id', user_id)
      .eq('paid', true)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .order('paid_at', { ascending: false });

    if (e2) throw e2;

    // Buscar bills pagas de meses anteriores mas pagas nos últimos 3 dias
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: paidPreviousRecent, error: e3 } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('user_id', user_id)
      .eq('paid', true)
      .lt('month', currentMonth) // mês anterior
      .gte('paid_at', threeDaysAgo)
      .order('paid_at', { ascending: false });

    if (e3) throw e3;

    res.json({
      unpaid: unpaidAll || [],
      paid_current: paidCurrent || [],
      paid_previous_recent: paidPreviousRecent || []
    });
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

app.post('/monthly-bills', async (req, res) => {
  try {
    const { user_id, name, value, due_day, month, year, paid, short_code } = req.body;
    const { data, error } = await supabase.from('monthly_bills').insert({
      user_id, name, value, due_day, month, year, paid, short_code
    }).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/budgets', async (req, res) => {
  try {
    const { user_id, category, limit_value } = req.body;
    const { data, error } = await supabase.from('budgets').insert({
      user_id, category, monthly_limit: limit_value
    }).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/budgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { monthly_limit } = req.body;
    
    const { data, error } = await supabase
      .from('budgets')
      .update({ monthly_limit })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/installments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_installment, active } = req.body;
    
    const { data, error } = await supabase
      .from('installments')
      .update({ current_installment, active })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/goals', async (req, res) => {
  try {
    const { user_id, name, target_value, current_value, category } = req.body;
    const { data, error } = await supabase.from('goals').insert({
      user_id, name, target_value, current_value: current_value || 0, category
    }).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/user-profile', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    const { data, error } = await supabase.from('user_profiles').select('tithe_active, tithe_percentage').eq('user_id', user_id).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || { tithe_active: true, tithe_percentage: 10 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/user-profile', async (req, res) => {
  try {
    const { user_id, tithe_active, tithe_percentage, tithe_percentage_changed_at, tithe_percentage_previous } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    
    const updates: any = {};
    if (tithe_active !== undefined) updates.tithe_active = tithe_active;
    if (tithe_percentage !== undefined) updates.tithe_percentage = tithe_percentage;
    if (tithe_percentage_changed_at !== undefined) updates.tithe_percentage_changed_at = tithe_percentage_changed_at;
    if (tithe_percentage_previous !== undefined) updates.tithe_percentage_previous = tithe_percentage_previous;

    const { data: existing } = await supabase.from('user_profiles').select('id').eq('user_id', user_id).single();

    let result;
    if (existing) {
      result = await supabase.from('user_profiles').update(updates).eq('user_id', user_id).select();
    } else {
      result = await supabase.from('user_profiles').insert({ user_id, ...updates }).select();
    }

    if (result.error) throw result.error;
    res.json(result.data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/tithe-summary', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    const now = new Date();

    const [profileRes, txRes, paymentsRes] = await Promise.all([
      supabase.from('user_profiles').select('tithe_percentage, tithe_percentage_previous, tithe_percentage_changed_at').eq('user_id', user_id).single(),
      supabase.from('transactions').select('id, description, value, occurred_at')
        .eq('user_id', user_id).eq('counts_for_tithe', true).eq('type', 'income')
        .order('occurred_at', { ascending: false }),
      supabase.from('tithe_payments').select('*')
        .eq('user_id', user_id).order('paid_at', { ascending: false })
    ]);

    const percentage = profileRes.data?.tithe_percentage ?? 10;
    const incomes = txRes.data || [];
    const payments = paymentsRes.data || [];

    // Agrupar receitas por mês/ano
    const monthlyMap: Record<string, any> = {};
    incomes.forEach(inc => {
      const d = new Date(inc.occurred_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          key,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          total_income: 0,
          tithe_due: 0,
          incomes: []
        };
      }
      monthlyMap[key].total_income += Number(inc.value);
      monthlyMap[key].incomes.push(inc);
    });

    // Buscar dados de mudança de porcentagem
    const changedAt = profileRes.data?.tithe_percentage_changed_at;
    const previousPct = profileRes.data?.tithe_percentage_previous ?? percentage;

    // Calcular tithe_due por transação individual dentro de cada mês
    Object.values(monthlyMap).forEach((m: any) => {
      m.tithe_due = 0;
      m.incomes.forEach((inc: any) => {
        const incDate = new Date(inc.occurred_at);
        const pctToUse = (changedAt && incDate < new Date(changedAt))
          ? previousPct
          : percentage;
        m.tithe_due += Number(inc.value) * (pctToUse / 100);
        inc.tithe_pct = pctToUse;
      });
      // % do mês = % da última receita do mês (para exibição)
      m.tithe_pct = m.incomes.length > 0
        ? m.incomes[m.incomes.length - 1].tithe_pct
        : percentage;
    });

    // Distribuir pagamentos pelos meses (FIFO — paga o mais antigo primeiro)
    const sortedMonths = Object.values(monthlyMap).sort((a: any, b: any) =>
      a.key.localeCompare(b.key)
    );

    let remainingPayments = payments.reduce((sum, p) => sum + Number(p.value), 0);
    sortedMonths.forEach((m: any) => {
      if (remainingPayments >= m.tithe_due) {
        m.paid = m.tithe_due;
        m.balance_due = 0;
        remainingPayments -= m.tithe_due;
      } else {
        m.paid = remainingPayments;
        m.balance_due = m.tithe_due - remainingPayments;
        remainingPayments = 0;
      }
    });

    // Totais gerais

    // Calcular tithe_due por receita respeitando a data de mudança
    let tithe_due = 0;
    const total_titheable = incomes.reduce((sum, tx) => sum + Number(tx.value), 0);

    incomes.forEach((inc: any) => {
      const incDate = new Date(inc.occurred_at);
      const pctToUse = (changedAt && incDate < new Date(changedAt)) 
        ? previousPct 
        : percentage;
      tithe_due += Number(inc.value) * (pctToUse / 100);
      inc.tithe_pct = pctToUse; // adicionar ao objeto para o frontend
    });
    const total_paid = payments.reduce((sum, p) => sum + Number(p.value), 0);
    const balance_due = tithe_due - total_paid;

    // Mês atual
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = monthlyMap[currentKey];

    res.json({
      total_titheable,
      tithe_due,
      total_paid,
      balance_due,
      titheable_incomes: incomes,
      payments,
      monthly_breakdown: sortedMonths,
      current_month: currentMonth || null,
      tithe_pct_current: percentage
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/tithe-payments', async (req, res) => {
  try {
    const { user_id, value, description, short_code, tithe_pct } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { data, error } = await supabase.from('tithe_payments').insert({
      user_id, value, description, short_code,
      tithe_pct: tithe_pct || null
    }).select();

    if (error) throw error;
    res.json(data[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`API Pera rodando na porta ${port}`);
});
