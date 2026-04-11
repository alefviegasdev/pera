import React, { useState, useEffect } from 'react';
import { catBg, catColor, catEmoji } from '../utils/categories';
import TransactionModal from '../components/TransactionModal';

const History = ({ userId }: { userId: string }) => {
  const [txs, setTxs] = useState<any[]>([]);
  const [insts, setInsts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => { fetchAll(); }, [userId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [txRes, instRes] = await Promise.all([
        fetch(`/api/transactions?user_id=${userId}&period=month`),
        fetch(`/api/installments?user_id=${userId}`)
      ]);
      const txData = await txRes.json();
      const instData = await instRes.json();
      
      setTxs(txData.transactions || []);
      setTotal(txData.total_expense || 0); // Using expense as total moved maybe?
      setInsts(Array.isArray(instData) ? instData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* Group transactions by date */
  const groups: Record<string, any[]> = {};
  txs.forEach(t => {
    const dObj = new Date(t.occurred_at);
    // e.g. "Hoje, 12 Abr" or just "11 Abr"
    const isToday = new Date().toDateString() === dObj.toDateString();
    let d = String(dObj.getDate()).padStart(2, '0') + ' ' + dObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    d = d.charAt(0).toUpperCase() + d.slice(1);
    const key = isToday ? `Hoje, ${d}` : d;
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  return (
    <div className="screen">
      <header className="page-header">
        <h1 className="font-display text-3xl mb-1">Histórico</h1>
        <p className="text-muted text-sm font-semibold">Todas as suas transações</p>
      </header>

      <div className="page-content">
        
        {/* Sumário do período */}
        <div className="mb-4 pl-1">
          <p className="font-display text-4xl mb-1">{fmt(total)}</p>
          <p className="text-sm font-semibold text-muted">{txs.length} transações neste mês</p>
        </div>

        {/* Parcelamentos */}
        {insts.length > 0 && (
          <div className="card-low mb-2 py-4">
            <h2 className="sec-label mb-3 ml-2">Parcelamentos Ativos</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 px-2" style={{ scrollbarWidth: 'none' }}>
              {insts.map(inst => {
                const color = catColor(inst.category);
                const emoji = catEmoji(inst.category);
                return (
                  <div key={inst.id} className="card min-w-[200px] flex-shrink-0 p-4 shadow-card">
                    <div className="flex items-center gap-2 mb-3">
                       <span className="text-xl">{emoji}</span>
                       <span className="text-xs font-bold text-muted uppercase tracking-wide">{inst.category}</span>
                    </div>
                    <h3 className="font-bold text-sm mb-1 truncate">{inst.description}</h3>
                    <div className="flex justify-between items-center mt-2">
                       <span className="text-xs font-semibold text-muted">{inst.current_installment}/{inst.total_installments}</span>
                       <span className="font-bold text-sm text-[var(--primary)]">{fmt(inst.installment_value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista Agrupada */}
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="skeleton h-16 mb-3" />)
        ) : Object.keys(groups).length === 0 ? (
          <div className="text-center py-10 opacity-60">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-headline text-lg">Sem transações</p>
          </div>
        ) : (
          Object.entries(groups).map(([date, items]) => (
            <div key={date} className="mb-5">
              <h3 className="sec-label mb-2 px-1">{date}</h3>
              <div className="flex flex-col gap-3">
                {items.map(t => {
                  const color = catColor(t.category);
                  const emoji = catEmoji(t.category);
                  const isIncome = t.type === 'income';
                  
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTx(t)}
                      className="card p-3 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 text-xl" style={{ background: color + '22' }}>
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm mb-0.5 truncate">{t.description}</p>
                        <p className="text-xs font-semibold text-muted">{t.category}</p>
                      </div>
                      <div className={`font-bold text-[15px] flex-shrink-0 ${isIncome ? 'text-[#354900]' : 'text-[var(--on-surface)]'}`}>
                        {isIncome ? '+' : '−'} {fmt(t.value)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTx && (
        <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
};

export default History;
