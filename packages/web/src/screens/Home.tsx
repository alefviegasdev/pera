import React, { useState, useEffect } from 'react';
import { catBg, catColor, catEmoji } from '../utils/categories';
import TransactionModal from '../components/TransactionModal';
import BillsModal from '../components/BillsModal';
import { ArrowRight, ArrowUpRight, ArrowDownRight, AlertTriangle, CreditCard, ChevronRight, Plus, Zap, Wifi, Home as HomeIcon, Dumbbell } from 'lucide-react';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const Home = ({ userId, userMetadata }: { userId: string; userMetadata?: any }) => {
  const [summary, setSummary] = useState<any>(null);
  const [bills, setBills]     = useState<any[]>([]);
  const [txs, setTxs]         = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showBillsModal, setShowBillsModal] = useState(false);

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

  const markAsPaid = async (bill: any) => {
    try {
      const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // 1. Mark bill as paid
      const billPromise = fetch(`/api/monthly-bills/${bill.id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: true })
      });

      // 2. Create transaction
      const txPromise = fetch(`/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          value: bill.value,
          type: 'expense',
          category: 'Contas',
          subtype: 'fixed',
          urgency: 'planned',
          description: bill.name,
          source: 'manual',
          short_code: shortCode
        })
      });

      await Promise.all([billPromise, txPromise]);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const getBillIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('luz') || n.includes('energia')) return <Zap size={24} className="text-primary" />;
    if (n.includes('internet') || n.includes('wifi')) return <Wifi size={24} className="text-primary" />;
    if (n.includes('aluguel') || n.includes('condomínio')) return <HomeIcon size={24} className="text-primary" />;
    if (n.includes('academia') || n.includes('gym')) return <Dumbbell size={24} className="text-primary" />;
    return <Zap size={24} className="text-primary" />;
  };

  const now   = new Date();
  const today = now.getDate();
  const monthLabel = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  const pendingBills = bills.filter(b => !b.paid).sort((a, b) => a.due_day - b.due_day);
  const alerts  = pendingBills.filter(b => b.due_day <= today + 2);

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  const splitFmt = (n: number) => {
    const s = fmt(n);
    const parts = s.split(',');
    if (parts.length < 2) return { int: s, dec: '' };
    return { int: parts[0], dec: ',' + parts[1] };
  };

  if (loading) return (
    <div className="screen bg-surface">
      <header className="w-full flex justify-between items-center px-6 py-6">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full skeleton" />
            <div className="space-y-1">
               <div className="w-20 h-3 skeleton" />
               <div className="w-24 h-4 skeleton" />
            </div>
         </div>
      </header>
      <div className="px-6 space-y-8">
        <div className="skeleton" style={{ height: 100 }} />
        <div className="grid grid-cols-2 gap-4">
           <div className="skeleton" style={{ height: 120 }} />
           <div className="skeleton" style={{ height: 120 }} />
        </div>
        <div className="skeleton" style={{ height: 180 }} />
      </div>
    </div>
  );

  const balanceParts = splitFmt(summary?.balance ?? 0);
  const userName = userMetadata?.name?.split(' ')[0] || 'Michel';

  return (
    <div className="screen bg-surface pb-32">
      {/* ── HEADER ── */}
      <header className="w-full sticky top-0 z-40 bg-[#f7f6f1]/70 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-container">
            {userMetadata?.avatar ? (
              <img src={userMetadata.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-primary to-primary-container">
                {userName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-on-surface-variant font-medium text-xs font-body uppercase tracking-wider opacity-60">Seja bem-vindo</p>
            <p className="text-on-surface font-black text-xl font-headline leading-tight">{userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-2xl font-black tracking-tighter text-[#5d3fd3]">Pera</div>
        </div>
      </header>

      <main className="px-6 pt-4 space-y-8">
        {/* ── SALDO GERAL ── */}
        <section className="space-y-1">
          <h2 className="text-on-surface-variant font-medium font-body text-sm">Saldo Geral</h2>
          <div className="flex items-baseline gap-1">
            <span className={`font-black text-5xl tracking-tight font-headline ${(summary?.balance || 0) < 0 ? 'text-error' : 'text-primary'}`}>
              {balanceParts.int}
            </span>
            <span className={`font-bold text-2xl font-headline ${(summary?.balance || 0) < 0 ? 'text-error opacity-70' : 'text-primary-container'}`}>
              {balanceParts.dec}
            </span>
          </div>
        </section>

        {/* ── SUMMARY BENTO ── */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-tertiary-container p-6 rounded-[2rem] space-y-4">
            <div className="flex items-center justify-between">
              <ArrowDownRight size={20} className="text-on-tertiary-container" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-tertiary-container">Entradas</span>
            </div>
            <p className="text-on-tertiary-container font-extrabold text-xl font-headline tracking-tight">
              {fmt(summary?.total_income ?? 0)}
            </p>
          </div>
          <div className="bg-primary-container p-6 rounded-[2rem] space-y-4">
            <div className="flex items-center justify-between">
              <ArrowUpRight size={20} className="text-on-primary-container" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">Saídas</span>
            </div>
            <p className="text-on-primary-container font-extrabold text-xl font-headline tracking-tight">
              {fmt(summary?.total_expense ?? 0)}
            </p>
          </div>
        </section>

        {/* ── BUDGET PROGRESS ── */}
        <section className="bg-white p-8 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-on-surface font-extrabold text-xl font-headline">Orçamento Mensal</h2>
              <p className="text-on-surface-variant text-sm font-medium">Você utilizou 65% do limite</p>
            </div>
            <span className="text-primary font-bold font-headline text-lg">
              R$ 3.200 <span className="text-outline-variant font-normal text-sm">/ R$ 5k</span>
            </span>
          </div>
          <div className="w-full h-4 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: '65%' }}></div>
          </div>
        </section>

        {/* ── ALERTS ── */}
        {alerts.length > 0 && (
          <section className="bg-error-container p-6 rounded-[2rem] flex items-start gap-4">
            <div className="bg-white/20 p-2 rounded-full">
              <AlertTriangle size={24} className="text-on-error" />
            </div>
            <div className="space-y-1">
              <h3 className="text-on-error font-bold font-headline">Despesas Próximas</h3>
              <p className="text-on-error opacity-90 text-sm font-medium">
                Você tem {alerts.length} conta{alerts.length > 1 ? 's' : ''} vencendo em breve.
              </p>
            </div>
          </section>
        )}

        {/* ── UPCOMING BILLS ── */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-on-surface font-extrabold text-xl font-headline">Próximos Vencimentos</h2>
            <button 
              onClick={() => setShowBillsModal(true)}
              className="text-primary font-black text-[10px] uppercase tracking-widest px-3 py-1.5 bg-primary/5 rounded-full"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-4">
            {pendingBills.slice(0, 3).map(b => {
              const daysLeft = b.due_day - today;
              return (
                <div key={b.id} className="bg-white p-6 rounded-[2rem] flex items-center justify-between border border-surface-container/50 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-surface-container-low rounded-2xl flex items-center justify-center">
                      {getBillIcon(b.name)}
                    </div>
                    <div>
                      <p className="text-on-surface font-bold text-base font-headline">{b.name}</p>
                      <p className={`text-sm mt-0.5 font-bold ${daysLeft <= 2 ? 'text-error' : 'text-on-surface-variant'}`}>
                        {daysLeft === 0 ? 'Vence hoje' : daysLeft < 0 ? `Atrasado ${Math.abs(daysLeft)}d` : `Vence em ${daysLeft} dias`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <p className="text-on-surface font-black text-lg tracking-tight">{fmt(b.value)}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); markAsPaid(b); }}
                      className="bg-primary text-on-primary px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/10"
                    >
                      Pagar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CATEGORY HIGHLIGHTS ── */}
        <section className="space-y-4">
          <h2 className="text-on-surface font-extrabold text-xl font-headline">Onde você mais gasta</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {summary?.by_category?.length > 0 ? (
              summary.by_category.slice(0, 5).map((cat: any, idx: number) => (
                <div key={cat.category} className={`min-w-[140px] ${idx === 0 ? 'bg-secondary-container' : 'bg-white'} p-5 rounded-[2rem] flex flex-col items-center text-center space-y-3 shadow-sm`}>
                  <div className={`w-12 h-12 ${idx === 0 ? 'bg-white/30' : 'bg-surface-container-low'} rounded-full flex items-center justify-center text-xl`}>
                    {catEmoji(cat.category)}
                  </div>
                  <div>
                    <p className={`${idx === 0 ? 'text-on-secondary-container' : 'text-on-surface'} font-bold text-sm truncate`}>{cat.category}</p>
                    <p className={`${idx === 0 ? 'text-on-secondary-container opacity-70' : 'text-on-surface-variant'} text-[10px] font-bold uppercase tracking-widest`}>{cat.count} VISITAS</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full p-8 text-center bg-white rounded-[2rem]">
                <p className="text-on-surface-variant font-medium text-sm">Sem dados suficientes ainda.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── RECENT TRANSACTIONS ── */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-on-surface font-extrabold text-xl font-headline">Últimas Transações</h2>
            <button className="text-primary font-bold text-sm">Ver todas</button>
          </div>
          <div className="bg-white rounded-[2.5rem] divide-y divide-surface-container-low shadow-sm">
            {txs.slice(0, 5).map(t => {
              const isIncome = t.type === 'income';
              return (
                <div key={t.id} onClick={() => setSelectedTx(t)} className="p-5 flex items-center justify-between cursor-pointer active:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center text-xl">
                      {catEmoji(t.category)}
                    </div>
                    <div>
                      <p className="text-on-surface font-bold font-body">{t.description}</p>
                      <p className="text-on-surface-variant text-xs">{t.category}</p>
                    </div>
                  </div>
                  <p className={`font-extrabold ${isIncome ? 'text-tertiary' : 'text-on-surface'}`}>
                    {isIncome ? '+' : '−'} {fmt(t.value).replace('R$', '')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* FAB */}
      <button className="fixed bottom-32 right-6 w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform z-40">
        <Plus size={28} />
      </button>

      {/* MODALS */}
      {selectedTx && (
        <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}

      {showBillsModal && (
        <BillsModal 
          bills={pendingBills}
          onClose={() => setShowBillsModal(false)}
          onPay={markAsPaid}
        />
      )}
    </div>
  );
};

export default Home;
