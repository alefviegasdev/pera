const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://amfgvigjgbrtcnddjusw.supabase.co',
  'sb_secret_DALV1QqYBrQSPVgl6iQs3Q_YueZQ4tW'
);

async function migrate() {
  console.log('Fetching bills from month 4, 2026...');
  const { data: bills, error: err1 } = await supabase
    .from('monthly_bills')
    .select('*')
    .eq('month', 4)
    .eq('year', 2026);
    
  if (err1) {
    console.error('Error fetching:', err1);
    return;
  }

  // The bills user created: aluguel, internet, terapia, academia, Luz
  const targetNames = ['aluguel', 'internet', 'terapia', 'academia', 'Luz'];
  const toMigrate = bills.filter(b => targetNames.includes(b.name) && !b.subtype);

  if (toMigrate.length === 0) {
    console.log('No bills found to migrate.');
    return;
  }

  console.log(`Found ${toMigrate.length} bills to migrate.`);

  const fixedExpensesData = toMigrate.map(b => ({
    user_id: b.user_id,
    name: b.name,
    value: b.value,
    due_day: b.due_day,
    category: b.category || 'Contas', // Fallback to 'Contas' if null
    active: true
  }));

  console.log('Inserting into fixed_expenses...');
  const { error: err2 } = await supabase
    .from('fixed_expenses')
    .insert(fixedExpensesData);

  if (err2) {
    console.error('Error inserting:', err2);
    return;
  }

  // Update subtype of the migrated bills to 'fixed' so they are recognized correctly
  console.log('Updating subtype in monthly_bills...');
  for (const b of toMigrate) {
    await supabase.from('monthly_bills').update({ subtype: 'fixed', category: b.category || 'Contas' }).eq('id', b.id);
  }

  console.log('Migration complete!');
}

migrate();
