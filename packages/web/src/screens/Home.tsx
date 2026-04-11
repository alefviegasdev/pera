import React, { useState, useEffect } from 'react';
import { catBg, catColor, catEmoji } from '../utils/categories';
import TransactionModal from '../components/TransactionModal';
import { ArrowRight, ArrowUpRight, ArrowDownRight, AlertTriangle, CreditCard, ChevronRight, Plus } from 'lucide-react';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const Home = ({ userId }: { userId: string }) => {
  const [summary, setSummary] = useState<any>(null);
  const [bills, setBills]     = useState<any[]>([]);
  const [txs, setTxs]         = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, bRes, tRes] = await Promise.all([
        fetch(`/api/transactions/summary?user_id=${userId}&period=month`),
        fetch(`/api/monthly-bills?user_id=${userId}`),
        fetch(`/api/transactions?user_id=${userId}&period=month`)
      ]);
      setSummary(await sRes.json());
      const billsData = await bRes.json();
      setBills(Array.isArray(billsData) ? billsData : []);
      const txData = await tRes.json();
      setTxs(txData.transactions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markAsPaid = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/monthly-bills/${id}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: true })
    });
    fetchData();
  };

  const now   = new Date();
  const today = now.getDate();
  const monthLabel = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  const pendingBills = bills.filter(b => !b.paid).sort((a, b) => a.due_day - b.due_day);
  const alerts  = pendingBills.filter(b => b.due_day <= today + 2); // close to due

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  if (loading) return (
    <div className="screen">
      <div className="page-header">
        <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '30%' }} />
      </div>
      <div className="page-content">
        <div className="skeleton" style={{ height: 180 }} />
        <div className="skeleton" style={{ height: 140 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    </div>
  );

  return (
    <div className="screen">
      {/* ── SAUDAÇÃO ── */}
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="font-display text-3xl mb-1 truncate max-w-[200px]">Olá, {userId === '5637235532' ? 'Michel' : userId}</h1>
          <p className="text-muted text-sm font-semibold">{monthLabel}, {year}</p>
        </div>
        <div className="avatar">P</div>
      </header>

      <div className="page-content">

        {/* ── SALDO GERAL ── */}
        <div className="card text-center pb-8 pt-6 relative overflow-hidden shadow-float">
          <p className="text-label mb-2">Saldo Geral</p>
          <p className="font-display text-[42px] leading-tight mb-6">
            {fmt(summary?.balance ?? 0)}
          </p>
          <div className="flex justify-center gap-3">
             <div className="chip chip-income text-sm py-1.5 px-3">
              <ArrowDownRight size={16} /> Entradas {fmt(summary?.total_income ?? 0)}
            </div>
            <div className="chip chip-expense text-sm py-1.5 px-3">
              <ArrowUpRight size={16} /> Saídas {fmt(summary?.total_expense ?? 0)}
            </div>
          </div>
        </div>

        {/* ── PROGRESSO DO ORÇAMENTO ── */}
        <div className="card-tertiary">
          <h2 className="font-headline text-lg mb-2">Progresso do Orçamento</h2>
          <p className="text-sm font-bold text-[#354900] mb-3">Você utilizou 65% do limite mensal</p>
          <div className="progress-track-sm mb-4 bg-[rgba(255,255,255,0.4)]">
            <div className="progress-bar-green" style={{ width: '65%' }} />
          </div>
          {/* ALERTAS DE ATENÇÃO */}
          <div className="card-error p-3 rounded-xl flex gap-3 items-start mt-4">
             <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" color="var(--on-error-container)" />
             <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--on-error-container)] mb-1">Alertas de Atenção</p>
                <p className="text-xs font-semibold text-[var(--on-error-container)] leading-snug">
                  Atenção: Você gastou 80% do limite de lazer estabelecido para este mês.
                </p>
             </div>
          </div>
        </div>

        {/* ── ONDE VOCÊ MAIS GASTA ── */}
        <div className="card-low">
          <h2 className="font-headline text-lg mb-4">Onde você mais gasta</h2>
          {summary?.by_category?.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {summary.by_category.slice(0, 4).map((cat: any) => (
                <div key={cat.category} className="card flex-shrink-0 min-w-[140px] p-4 text-center">
                   <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl mb-3" style={{ background: catBg(cat.category) }}>
                      {catEmoji(cat.category)}
                   </div>
                   <p className="font-bold text-sm truncate mb-1">{cat.category}</p>
                   <p className="text-xs font-bold text-muted uppercase tracking-widest">{cat.count} VISITAS</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-muted text-center py-4">Sem dados suficientes no período.</p>
          )}
        </div>

        {/* ── PRÓXIMOS VENCIMENTOS ── */}
        <div className="card-container">
          <h2 className="font-headline text-lg mb-4">Próximos Vencimentos</h2>
          {pendingBills.length > 0 ? (
            <div className="flex flex-col gap-4">
              {pendingBills.slice(0, 3).map(b => (
                  <div key={b.id} className="flex items-center gap-3 bg-[var(--surface-card)] p-3 rounded-[20px] shadow-card">
                    <div className="flex-1 min-w-0 pl-1">
                      <p className="font-bold text-sm truncate mb-0.5">{b.name}</p>
                      <p className="text-xs text-muted font-semibold">
                         Vence em {b.due_day - today > 0 ? b.due_day - today : 'poucos'} dias
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold text-sm">{fmt(b.value)}</span>
                      <button className="btn-pay" onClick={(e) => markAsPaid(b.id, e)}>
                        Pagar
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          ) : (
             <p className="text-sm font-semibold text-muted text-center py-4">Nenhuma conta pendente.</p>
          )}
        </div>

        {/* ── ÚLTIMAS TRANSAÇÕES ── */}
        <div className="card-low">
           <div className="flex justify-between items-center mb-4">
              <h2 className="font-headline text-lg">Últimas Transações</h2>
              <button className="text-xs font-bold text-primary uppercase tracking-wider">Ver todas</button>
           </div>
           {txs.length > 0 ? (
             <div className="flex flex-col gap-2">
                 {txs.slice(0, 4).map(t => {
                   const isIncome = t.type === 'income';
                   const dObj = new Date(t.occurred_at);
                   const isToday = new Date().toDateString() === dObj.toDateString();
                   const dateStr = isToday ? 'Hoje' : dObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                   
                   return (
                     <button
                       key={t.id}
                       onClick={() => setSelectedTx(t)}
                       className="card p-3 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
                     >
                       <div className="flex-1 min-w-0">
                         <p className="font-bold text-[15px] mb-0.5 truncate">{t.description}</p>
                         <p className="text-[12px] font-semibold text-muted">{dateStr} • {t.category}</p>
                       </div>
                       <div className={`font-bold text-[15px] flex-shrink-0 ${isIncome ? 'text-[#354900]' : 'text-[var(--on-surface)]'}`}>
                         {isIncome ? '+' : '−'} {fmt(t.value)}
                       </div>
                     </button>
                   );
                 })}
             </div>
           ) : (
             <p className="text-sm font-semibold text-muted text-center py-4">Nenhuma transação recente.</p>
           )}
        </div>

      </div>

      {/* FAB - Quick Add / Botão flutuante "+" */}
      <button className="fab">
        <Plus size={24} strokeWidth={3} />
      </button>

      {/* MODAL TRANSAÇÃO */}
      {selectedTx && (
        <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
};

export default Home;
