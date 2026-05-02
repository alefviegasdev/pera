const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://amfgvigjgbrtcnddjusw.supabase.co',
  'sb_secret_DALV1QqYBrQSPVgl6iQs3Q_YueZQ4tW'
);

async function checkBills() {
  console.log('--- FIXED EXPENSES ---');
  const { data: fixed } = await supabase.from('fixed_expenses').select('name,value,due_day');
  console.log(fixed);

  console.log('\n--- MONTHLY BILLS (MAIO 2026) ---');
  const { data: monthly } = await supabase
    .from('monthly_bills')
    .select('name,value,due_day')
    .eq('month', 5)
    .eq('year', 2026);
  console.log(monthly);
}

checkBills();
