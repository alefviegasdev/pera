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
  'Nubank': { from: '#820AD1', to: '#5a0792', text: '#ffffff' },
  'Itaú': { from: '#FF6600', to: '#cc4400', text: '#ffffff' },
  'Bradesco': { from: '#CC0000', to: '#990000', text: '#ffffff' },
  'Inter': { from: '#FF7A00', to: '#cc5500', text: '#ffffff' },
  'C6 Bank': { from: '#242424', to: '#000000', text: '#ffffff' },
  'Santander': { from: '#EC0000', to: '#b30000', text: '#ffffff' },
  'Caixa': { from: '#005CA9', to: '#003d70', text: '#ffffff' },
  'Banco do Brasil': { from: '#FFCC00', to: '#cc9900', text: '#000000' },
  'XP': { from: '#111111', to: '#000000', text: '#ffffff' },
  'BTG': { from: '#003087', to: '#001a4d', text: '#ffffff' },
};

export { catColor, catEmoji, catBg, BANK_COLORS };
