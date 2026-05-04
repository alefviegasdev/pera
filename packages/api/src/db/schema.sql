CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category TEXT NOT NULL,
  subtype TEXT NOT NULL CHECK (subtype IN ('fixed', 'unique', 'semifixed')),
  urgency TEXT NOT NULL CHECK (urgency IN ('urgent', 'necessity', 'secondary')),
  description TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'text' CHECK (source IN ('text', 'audio', 'photo', 'auto')),
  is_exception BOOLEAN DEFAULT FALSE,
  short_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: The following tables were added in a later update
CREATE TABLE installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,
  installment_value DECIMAL(10,2) NOT NULL,
  total_installments INTEGER NOT NULL,
  current_installment INTEGER DEFAULT 1,
  category TEXT NOT NULL,
  urgency TEXT DEFAULT 'secondary',
  start_date DATE DEFAULT CURRENT_DATE,
  due_day INTEGER,
  active BOOLEAN DEFAULT TRUE,
  short_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bill_due_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  category TEXT NOT NULL,
  estimated_value DECIMAL(10,2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fixed_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value DECIMAL(10,2),
  value_type TEXT DEFAULT 'fixed' CHECK (value_type IN ('fixed', 'percent')),
  category TEXT NOT NULL,
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_limit DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  deadline DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
