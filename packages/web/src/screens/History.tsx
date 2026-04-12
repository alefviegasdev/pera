import React, { useState, useEffect } from 'react';
import { catColor, catEmoji } from '../utils/categories';
import TransactionModal from '../components/TransactionModal';

const History = ({ userId }: { userId: string }) => {
  const [txs, setTxs] = useState<any[]>([]);
  const [insts, setInsts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => { fetchAll(); }, [userId, period]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [txRes, instRes] = await Promise.all([
        fetch(`/api/transactions?user_id=${userId}&period=${period}`),
        fetch(`/api/installments?user_id=${userId}`)
      ]);
      const txData = await txRes.json();
      const instData = await instRes.json();
      
      setTxs(txData.transactions || []);
      setTotal(txData.total_expense || 0);
      setInsts(Array.isArray(instData) ? instData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (str: string) => {
    if (!str) return 'TX';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '') + (parts[2]?.[0] || '')).toUpperCase();
  };

  /* Group transactions by date */
  const groups: Record<string, any[]> = {};
  txs.forEach(t => {
    const dObj = new Date(t.occurred_at);
    const isToday = new Date().toDateString() === dObj.toDateString();
    let d = String(dObj.getDate()).padStart(2, '0') + ' ' + dObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    d = d.charAt(0).toUpperCase() + d.slice(1);
    const key = isToday ? `Hoje, ${d}` : d;
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  const periods = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Este mês' },
    { id: '30days', label: '30 dias' },
    { id: '90days', label: '90 dias' },
    { id: 'all', label: 'Tudo' },
  ];

  return (
    <div className="screen bg-surface">
      <header className="page-header pt-12 pb-4 px-6 sticky top-0 bg-surface/80 backdrop-blur-lg z-50">
        <h1 className="font-headline tracking-tighter text-on-surface text-4xl font-extrabold leading-none">Histórico</h1>
      </header>

      <main className="page-content px-6 space-y-8 mt-4">
        {/* Period Filter Chips */}
        <section className="overflow-x-auto scrollbar-hide flex items-center gap-2 -mx-6 px-6 py-1">
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                period === p.id 
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {p.label}
            </button>
          ))}
        </section>

        {/* Transaction Summary Card */}
        <section className="card-white rounded-[2rem] p-8 flex flex-col gap-1 shadow-sm">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Volume Total</span>
          <div className="flex flex-col">
            <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tighter">
              {loading ? '...' : fmt(total)}
            </h2>
            <p className="text-primary font-bold text-xs mt-1.5">{txs.length} transações no período</p>
          </div>
        </section>

        {/* Active Installments Section */}
        {insts.length > 0 && (
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-headline font-extrabold text-lg tracking-tight text-on-surface">Parcelamentos Ativos</h3>
              <span className="text-primary text-xs font-black uppercase tracking-wider">Ver todos</span>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-2">
              {insts.slice(0, 3).map(inst => (
                <div key={inst.id} className="min-w-[280px] bg-primary text-on-primary rounded-[2rem] p-7 relative overflow-hidden group shadow-md shadow-primary/10">
                  {/* Abstract Pattern */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <circle cx="90" cy="10" fill="white" r="40" />
                      <circle cx="10" cy="90" fill="white" r="30" />
                    </svg>
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-on-primary/60 text-[10px] uppercase tracking-[0.2em] font-black mb-1.5">{inst.category}</p>
                        <h4 className="font-headline font-bold text-xl leading-tight truncate max-w-[160px]">{inst.description}</h4>
                      </div>
                      <div className="bg-on-primary/15 backdrop-blur-md rounded-full px-3.5 py-1.5 text-[11px] font-black">
                        {inst.current_installment}/{inst.total_installments}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 w-full bg-on-primary/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-tertiary-container rounded-full" 
                          style={{ width: `${(inst.current_installment / inst.total_installments) * 100}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-on-primary/80">
                        <span>{fmt(inst.installment_value)}/mês</span>
                        <span>Falta {fmt(inst.installment_value * (inst.total_installments - inst.current_installment))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transaction List Grouped */}
        <section className="space-y-8 pb-12">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="skeleton h-4 w-24 rounded-full mx-1" />
                <div className="space-y-3">
                  {Array(2).fill(0).map((_, j) => <div key={j} className="skeleton h-20 w-full rounded-[2rem]" />)}
                </div>
              </div>
            ))
          ) : Object.keys(groups).length === 0 ? (
            <div className="card-low text-center p-12 bg-surface-container-low rounded-[2rem]">
              <p className="text-3xl mb-4">🍐</p>
              <p className="font-headline font-bold text-on-surface-variant">Explore suas finanças!</p>
              <p className="text-xs text-muted font-medium mt-1">Nenhuma transação encontrada.</p>
            </div>
          ) : (
            Object.entries(groups).map(([date, items]) => (
              <div key={date} className="space-y-5">
                <h3 className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.3em] px-2">{date}</h3>
                <div className="space-y-2">
                  {items.map(t => {
                    const color = catColor(t.category);
                    const isIncome = t.type === 'income';
                    const initials = getInitials(t.description);

                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTx(t)}
                        className="w-full flex items-center justify-between p-3 rounded-[2rem] hover:bg-white/50 active:scale-[0.98] transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-13 h-13 rounded-full flex items-center justify-center font-headline font-black tracking-tighter text-sm transition-transform group-hover:scale-110"
                            style={{ backgroundColor: color + '22', color: color, width: '52px', height: '52px' }}
                          >
                            {initials}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-on-surface text-sm">{t.description}</p>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{t.category}</p>
                          </div>
                        </div>
                        <p className={`font-black text-sm ${isIncome ? 'text-tertiary' : 'text-on-surface'}`}>
                          {isIncome ? '+' : '−'} {fmt(t.value)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {selectedTx && (
        <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
};

export default History;
