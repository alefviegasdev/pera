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

export { catColor, catEmoji, catBg };
