import React, { useState, useEffect } from 'react';
import { catBg, catColor, catEmoji } from '../utils/categories';
import { Lightbulb, ChevronDown } from 'lucide-react';

const Analysis = ({ userId }: { userId: string }) => {
  const [summary, setSummary] = useState<any>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [userId, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/summary?user_id=${userId}&period=${period}`);
      setSummary(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  return (
    <div className="screen">
      <header className="page-header">
        <h1 className="font-display text-3xl mb-1">Análise</h1>
        <p className="text-muted text-sm font-semibold">Veja como seu dinheiro se moveu</p>
      </header>

      <div className="page-content">
        
        {/* Toggle between Incomes / Expenses theoretically, we can show both for now */}
        <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="card-low text-center p-4 rounded-[20px]">
                <p className="text-label mb-1">Entradas</p>
                <p className="font-display text-lg text-[#354900]">{fmt(summary?.total_income ?? 0)}</p>
            </div>
            <div className="card-low text-center p-4 rounded-[20px]">
                <p className="text-label mb-1">Saídas</p>
                <p className="font-display text-lg text-[var(--on-surface)]">{fmt(summary?.total_expense ?? 0)}</p>
            </div>
        </div>

        {/* Maiores Categorias */}
        <div className="card-container mt-2">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-headline text-xl">Maiores Categorias</h2>
            <button className="flex items-center gap-1 text-[var(--outline-variant)] text-xs font-bold uppercase tracking-wide">
              Composição <ChevronDown size={14} />
            </button>
          </div>

          {loading ? (
            <div className="skeleton rounded-xl h-40" />
          ) : summary?.by_category?.length > 0 ? (
            <div className="flex flex-col gap-6">
              {summary.by_category.slice(0, 5).map((cat: any) => {
                const color = catColor(cat.category);
                const emoji = catEmoji(cat.category);
                return (
                  <div key={cat.category}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-lg" style={{ background: color + '22' }}>
                            {emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm tracking-tight">{cat.category}</p>
                            <p className="text-xs text-muted font-semibold">{cat.count} transaç{cat.count === 1 ? 'ão' : 'ões'}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-sm">{fmt(cat.total)}</p>
                            <p className="text-[10px] font-bold text-muted">{Math.round(cat.percentage)}%</p>
                        </div>
                    </div>
                    <div className="progress-track-sm">
                      <div className="progress-bar" style={{ width: `${cat.percentage}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="text-center py-6">
                 <p className="text-sm font-semibold text-muted">Ainda não há gastos para analisar.</p>
             </div>
          )}
        </div>

        {/* Insight Card */}
        <div className="insight-card flex items-start gap-3 mt-2 shadow-float">
          <div className="bg-[rgba(255,255,255,0.2)] p-2 rounded-xl flex-shrink-0">
            <Lightbulb size={20} color="#fff" />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Insight da Pera 🍐</h3>
            <p className="text-xs text-[rgba(255,255,255,0.85)] leading-snug font-medium">
              Você gastou 15% menos em Alimentação este mês comparado à média. Isso ajuda no seu objetivo de Viagem.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analysis;
