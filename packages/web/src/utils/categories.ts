const catColor = (category: string): string => {
  const map: Record<string, string> = {
    'Alimentação': '#FF8C69',
    'Transporte':  '#5A9BF0',
    'Moradia':     '#4DB882',
    'Saúde':       '#E879A8',
    'Lazer':       '#A78BFA',
    'Doações':     '#F59E0B',
    'Educação':    '#06B6D4',
    'Receita':     '#4c6313',
    'Tecnologia':  '#6366F1',
    'Mercado':     '#10b981',
  };
  return map[category] || '#adada9';
};

const catEmoji = (category: string): string => {
  const map: Record<string, string> = {
    "Alimentação": "🛒",
    "Transporte": "🚗",
    "Saúde": "💊",
    "Lazer": "🎬",
    "Educação": "📚",
    "Contas": "💡",
    "Vestuário": "👕",
    "Eletrônicos": "📱",
    "Dízimo/Oferta": "🙏",
    "Outros": "📦",
    "Receita": "💰"
  };
  return map[category] || '💳';
};

const catBg = (category: string): string => {
  const color = catColor(category);
  return color + '22';
};

const BANK_COLORS: Record<string, { from: string; to: string; text: string }> = {
  'Nubank':        { from: '#8a05be', to: '#6b04a0', text: '#ffffff' },
  'Inter':         { from: '#ff6600', to: '#d45200', text: '#ffffff' },
  'Bradesco':      { from: '#cc0000', to: '#990000', text: '#ffffff' },
  'Itaú':          { from: '#003087', to: '#001f5b', text: '#ffffff' },
  'Santander':     { from: '#ec0000', to: '#b30000', text: '#ffffff' },
  'Caixa':         { from: '#005ca9', to: '#003d70', text: '#ffffff' },
  'Banco do Brasil': { from: '#f5c400', to: '#c49e00', text: '#1a1a00' },
  'C6 Bank':       { from: '#232323', to: '#111111', text: '#ffffff' },
  'PicPay':        { from: '#21c25e', to: '#16904a', text: '#ffffff' },
  'Neon':          { from: '#00d4ff', to: '#0099bb', text: '#001a22' },
  'XP':            { from: '#000000', to: '#222222', text: '#ffffff' },
  'Sicoob':        { from: '#007b5e', to: '#005540', text: '#ffffff' },
  'Default':       { from: '#1a1f71', to: '#071d49', text: '#ffffff' },
};

export { catColor, catEmoji, catBg, BANK_COLORS };
