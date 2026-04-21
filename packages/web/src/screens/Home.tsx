import React, { useState, useEffect } from 'react';
import { catBg, catColor, catEmoji } from '../utils/categories';
import TransactionModal from '../components/TransactionModal';
import FixedDetailsModal from '../components/FixedDetailsModal';
import CategoryDetailsModal from '../components/CategoryDetailsModal';
import IncomeDetailsModal from '../components/IncomeDetailsModal';
import TitheDetailsModal from '../components/TitheDetailsModal';
import { ArrowRight, ArrowUpRight, ArrowDownRight, AlertTriangle, CreditCard, ChevronRight, Zap, Wifi, Home as HomeIcon, Dumbbell, Pin, AlertCircle, CheckCircle2, Heart } from 'lucide-react';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const Home = ({ 
  userId, 
  userMetadata, 
  onTabChange, 
  onModalOpen, 
  onModalClose 
}: { 
  userId: string; 
  userMetadata?: any; 
  onTabChange?: (tab: any) => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) => {
  const [summary, setSummary] = useState<any>(null);
  const [bills, setBills]     = useState<any[]>([]);
  const [paidBills, setPaidBills] = useState<any[]>([]);
  const [paidPreviousRecent, setPaidPreviousRecent] = useState<any[]>([]);
  const [txs, setTxs]         = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [budgets, setBudgets]      = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [billTab, setBillTab] = useState<'pending' | 'paid'>('pending');
  const [titheSummary, setTitheSummary] = useState<any>(null);
  const [showTitheModal, setShowTitheModal] = useState(false);
  const [titheActive, setTitheActive] = useState(true);

  useEffect(() => {
    if (selectedTx || showFixedModal || selectedCategory || showIncomeModal || showTitheModal) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [selectedTx, showFixedModal, selectedCategory, showIncomeModal, showTitheModal]);



  useEffect(() => { fetchData(); }, [userId]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sRes, bRes, tRes, iRes, budgetsRes, titheSummaryRes, profileRes] = await Promise.all([
        fetch(`/api/transactions/summary?user_id=${userId}&period=month`),
        fetch(`/api/monthly-bills-all?user_id=${userId}`),
        fetch(`/api/transactions?user_id=${userId}&period=month`),
        fetch(`/api/installments?user_id=${userId}`),
        fetch(`/api/budgets?user_id=${userId}`),
        fetch(`/api/tithe-summary?user_id=${userId}`),
        fetch(`/api/user-profile?user_id=${userId}`)
      ]);
      setSummary(await sRes.json());
      const allBillsData = await bRes.json();
      const unpaidBills = Array.isArray(allBillsData.unpaid) ? allBillsData.unpaid : [];
      const paidCurrentBills = Array.isArray(allBillsData.paid_current) ? allBillsData.paid_current : [];
      const paidPrevRecent = Array.isArray(allBillsData.paid_previous_recent) ? allBillsData.paid_previous_recent : [];

      setBills(unpaidBills);
      setPaidBills(paidCurrentBills);
      setPaidPreviousRecent(paidPrevRecent);
      const txData = await tRes.json();
      setTxs(txData.transactions || []);
      const instData = await iRes.json();
      setInstallments(Array.isArray(instData) ? instData : []);
      const budgetsData = await budgetsRes.json();
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      
      const titheSummaryData = await titheSummaryRes.json();
      setTitheSummary(titheSummaryData);
      
      const profileData = await profileRes.json();
      setTitheActive(profileData?.tithe_active !== false);
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
          source: 'text',
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

  const markInstallmentAsPaid = async (inst: any) => {
    try {
      const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const nextCount = inst.current + 1;
      const isFinished = nextCount >= inst.total;

      // 1. Update installment in DB
      const patchPromise = fetch(`/api/installments/${inst.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_installment: nextCount,
          active: !isFinished
        })
      });

      // 2. Create transaction
      const txPromise = fetch(`/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          value: inst.value,
          type: 'expense',
          category: inst.category || 'Outros',
          subtype: 'semifixed',
          urgency: 'planned',
          description: isFinished ? `${inst.name} (Final)` : `${inst.name} (Parcela ${nextCount}/${inst.total})`,
          source: 'text',
          short_code: shortCode
        })
      });

      await Promise.all([patchPromise, txPromise]);
      fetchData(true);
    } catch (e) {
      console.error('[PARCELA] Erro:', e);
    }
  };

  const now   = new Date();
  const today = now.getDate();
  const monthLabel = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  const pendingBills = bills; // já são todas não pagas
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

  // Financial Calculations
  const income = summary?.total_income ?? 0;
  const expense = summary?.total_expense ?? 0;
  
  const paidInstallmentNames = txs
    .filter(t => t.subtype === 'semifixed' && t.type === 'expense')
    .map(t => t.description?.toLowerCase());

  const totalBills = bills.reduce((sum, b) => sum + Number(b.value), 0);
  const unpaidBillsVal = pendingBills.reduce((sum, b) => sum + Number(b.value), 0);
  const installmentTotal = installments.reduce((sum, i) => sum + Number(i.installment_value), 0);
  const unpaidInstallmentTotal = installments
    .filter(i => !paidInstallmentNames.some(name => i.description?.toLowerCase().includes(name) || name?.includes(i.description?.toLowerCase())))
    .reduce((sum, i) => sum + Number(i.installment_value), 0);
    
    const dizimoBudget = budgets.find(b => b.category === 'Dízimo/Oferta');
    const tithingFallback = dizimoBudget?.monthly_limit 
      ? Number(dizimoBudget.monthly_limit) 
      : income * 0.10;

    const tithePending = titheSummary?.balance_due > 0 ? titheSummary.balance_due : 0;
    const tithing = titheActive ? (tithePending > 0 ? tithePending : tithingFallback) : 0;

  // Values for the Total Card
  const totalFixedVal = totalBills + installmentTotal + tithing;
  const remainingFixedVal = unpaidBillsVal + unpaidInstallmentTotal + tithing;
  
  const realAvailable = income - expense - remainingFixedVal;
  const isNegative = realAvailable < 0;

  // Unified list for Vencimentos
  const allPending = [
    ...pendingBills.map(b => ({ ...b, itemType: 'bill' })),
    ...installments
      .filter(i => !paidInstallmentNames.some(name => i.description?.toLowerCase().includes(name) || name?.includes(i.description?.toLowerCase())))
      .map(i => ({ 
        id: i.id, 
        name: i.description, 
        value: i.installment_value, 
        category: i.category,
        itemType: 'installment',
        current: i.current_installment,
        total: i.total_installments
      })),
    ...(titheActive && titheSummary?.monthly_breakdown ? 
      titheSummary.monthly_breakdown
        .filter((m: any) => m.balance_due > 0)
        .map((m: any) => ({
          id: `tithing-${m.key}`,
          name: `Dízimo — ${MONTH_NAMES[m.month - 1]}`,
          value: m.balance_due,
          itemType: 'tithing',
          titheMonth: m
        }))
      : []
    )
  ];

  const allPaid = [
    ...paidBills.map(b => ({ ...b, itemType: 'bill', isFromPreviousMonth: false })),
    ...paidPreviousRecent.map(b => ({ 
      ...b, 
      itemType: 'bill', 
      isFromPreviousMonth: true,
      previousMonthName: MONTH_NAMES[b.month - 1]
    })),
    ...installments
      .filter(i => paidInstallmentNames.some(name => i.description?.toLowerCase().includes(name) || name?.includes(i.description?.toLowerCase())))
      .map(i => ({
        id: i.id,
        name: i.description,
        value: i.installment_value,
        itemType: 'installment',
        paid_at: new Date().toISOString() // Approximate
      }))
  ].sort((a,b) => {
    const dateA = a.paid_at ? new Date(a.paid_at).getTime() : 0;
    const dateB = b.paid_at ? new Date(b.paid_at).getTime() : 0;
    return dateB - dateA;
  });

  // Progress segments for the Real Available bar
  const totalRelevant = Math.max(income, expense + remainingFixedVal);
  const spentPct = totalRelevant > 0 ? (expense / totalRelevant) * 100 : 0;
  const fixedPct = totalRelevant > 0 ? (remainingFixedVal / totalRelevant) * 100 : 0;
  const availPct = Math.max(0, 100 - spentPct - fixedPct);

  // Budget Alerts logic
  const budgetAlerts = budgets
    .map(b => {
      const catSpend = summary?.by_category?.find((c: any) => c.category === b.category);
      const spent = catSpend ? Number(catSpend.total) : Number(b.spent);
      return { 
        category: b.category, 
        limit: Number(b.monthly_limit), 
        spent, 
        excess: spent - Number(b.monthly_limit) 
      };
    })
    .filter(b => b.excess > 0);

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
          <div 
            onClick={() => setShowIncomeModal(true)}
            className="col-span-2 bg-tertiary-container p-6 rounded-[2.5rem] flex flex-row items-center justify-between shadow-sm relative overflow-hidden group transition-all hover:scale-[1.01] cursor-pointer active:scale-[0.99]"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed-dim flex items-center justify-center">
                <ArrowDownRight size={22} className="text-on-tertiary-fixed" />
              </div>
              <p className="text-on-tertiary-container font-headline font-black text-2xl tracking-tight">
                {fmt(income)}
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-tertiary-fixed opacity-70 relative z-10">Entradas</span>
          </div>
          
          <div className="bg-primary-container p-6 rounded-[2.5rem] space-y-4 shadow-sm relative overflow-hidden group transition-all hover:scale-[1.01]">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center">
                <ArrowUpRight size={18} className="text-on-primary-container" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-on-primary-container opacity-60">Saídas</span>
            </div>
            <p className="text-on-primary-container font-headline font-black text-xl tracking-tight">
              {fmt(expense)}
            </p>
          </div>

          <div 
            onClick={() => setShowFixedModal(true)}
            className="bg-secondary-container p-6 rounded-[2.5rem] space-y-3 shadow-sm relative overflow-hidden group transition-all hover:scale-[1.01] cursor-pointer active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                <Pin size={18} className="text-on-secondary-container" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-on-secondary-container opacity-60">Custos Fixos</span>
            </div>
            <div>
              <p className="text-on-secondary-container font-headline font-black text-xl tracking-tight leading-tight">
                {fmt(totalFixedVal)}
              </p>
              <p className="text-on-secondary-container/70 text-[10px] font-bold mt-1">
                Falta pagar: {fmt(remainingFixedVal)}
              </p>
            </div>
          </div>
        </section>

        {/* ── REAL AVAILABLE BALANCE ── */}
        <section className="bg-white p-8 rounded-[3rem] space-y-8 shadow-sm border border-surface-container/30">
          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <h2 className="text-on-surface font-headline font-black text-2xl tracking-tight">Saldo Disponível Real</h2>
              <span className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-tertiary/5">Projeção</span>
            </div>
            <p className="text-on-surface-variant text-sm font-medium opacity-70">O que você ainda pode gastar este mês</p>
          </div>

          <div className="py-4">
            <p className="text-on-surface-variant text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-2">
              Disponível para o mês
            </p>
            <div className="flex items-baseline gap-1">
              <span className={`font-headline font-black text-5xl tracking-tight ${isNegative ? 'text-error' : 'text-tertiary'}`}>
                {splitFmt(realAvailable).int}
              </span>
              <span className={`font-headline font-black text-2xl ${isNegative ? 'text-error/60' : 'text-tertiary/60'}`}>
                {splitFmt(realAvailable).dec}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex w-full h-4 gap-1.5 overflow-hidden rounded-full bg-surface-container-low">
              {/* Spent Part */}
              <div 
                className="h-full bg-primary-dim rounded-l-full transition-all duration-1000 ease-out" 
                style={{ width: `${spentPct}%` }}
              />
              {/* Fixed Part */}
              <div 
                className="h-full bg-primary-container transition-all duration-1000 ease-out delay-100" 
                style={{ width: `${fixedPct}%` }}
              />
              {/* Available Part */}
              <div 
                className={`h-full rounded-r-full transition-all duration-1000 ease-out delay-200 ${isNegative ? 'bg-error' : 'bg-tertiary-container'}`}
                style={{ width: `${availPct}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary-dim"></div>
                  <span className="opacity-80 uppercase tracking-widest text-[10px]">Gastos realizados</span>
                </div>
                <span className="text-on-surface font-black">− {fmt(expense)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary-container"></div>
                  <span className="opacity-80 uppercase tracking-widest text-[10px]">Contas fixas previstas</span>
                </div>
                <span className="text-on-surface font-black">− {fmt(remainingFixedVal)}</span>
              </div>

            </div>
          </div>
        </section>

        {/* ── BUDGET ALERTS ── */}
        {budgetAlerts.length > 0 && (
          <section className="bg-error-container p-8 rounded-[2.5rem] flex items-start gap-5 shadow-lg shadow-error/5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <AlertTriangle size={80} className="text-white" />
            </div>
            <div className="bg-white/20 p-3 rounded-2xl relative z-10">
              <AlertTriangle size={28} className="text-white" />
            </div>
            <div className="space-y-3 relative z-10">
              <h3 className="text-white font-headline font-black text-xl tracking-tight">Alertas de Atenção</h3>
              <div className="space-y-2">
                <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Excedeu o limite em:</p>
                <div className="space-y-1">
                  {budgetAlerts.map(alert => (
                    <div key={alert.category} className="flex items-center gap-2 text-white font-bold text-sm">
                      <span className="opacity-50">•</span>
                      <span>{alert.category}: {fmt(alert.excess)} acima</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── BILLS (VENCIMENTOS) ── */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-on-surface font-extrabold text-xl font-headline">Vencimentos</h2>
          </div>

          {/* Segmented Control / Toggle Button Group */}
          <div className="bg-surface-container p-1 rounded-2xl flex items-center">
            <button 
              onClick={() => setBillTab('pending')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${billTab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-50'}`}
            >
              A pagar
            </button>
            <button 
              onClick={() => setBillTab('paid')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${billTab === 'paid' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-50'}`}
            >
              Pagos
            </button>
          </div>

          <div className="space-y-4">
            {billTab === 'pending' ? (
              allPending.map(b => {
                const isMonthlyBill = b.itemType === 'bill';
                const daysLeft = isMonthlyBill ? b.due_day - today : null;
                const isOverdue = b.itemType === 'bill' && 
                  (b.year < now.getFullYear() || 
                   (b.year === now.getFullYear() && b.month < now.getMonth() + 1));
                
                return (
                  <div key={b.id} onClick={b.itemType === 'tithing' ? () => setShowTitheModal(true) : undefined} className={`bg-white p-7 rounded-[2.5rem] flex items-center justify-between border border-surface-container/50 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] ${b.itemType === 'tithing' ? 'cursor-pointer' : ''}`}>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-surface-container-low rounded-2xl flex items-center justify-center">
                        {b.itemType === 'installment' ? <CreditCard size={24} className="text-secondary" /> : 
                         b.itemType === 'tithing' ? <Heart size={24} className="text-tertiary" fill="currentColor" /> : 
                         getBillIcon(b.name)}
                      </div>
                      <div>
                        <p className="text-on-surface font-bold text-base font-headline">{b.name}
                        {isOverdue && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-error/10 text-error">
                            Atrasado
                          </span>
                        )}
                        </p>
                        {isMonthlyBill ? (
                          <p className={`text-sm mt-0.5 font-bold ${daysLeft !== null && daysLeft <= 2 ? 'text-error' : 'text-on-surface-variant'}`}>
                            {daysLeft === 0 ? 'Vence hoje' : (daysLeft !== null && daysLeft < 0) ? `Atrasado ${Math.abs(daysLeft)}d` : `Vence em ${daysLeft} dias`}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mt-1 inline-block ${b.itemType === 'installment' ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'}`}>
                              {b.itemType === 'installment' ? 'Parcela' : 'Dízimo'}
                            </span>
                            {b.itemType === 'installment' && (
                              <span className="text-[10px] text-on-surface-variant font-medium">
                                Parcela {(b as any).current + 1} de {(b as any).total}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-on-surface font-black text-lg tracking-tight">{fmt(b.value)}</p>
                      {(isMonthlyBill || b.itemType === 'installment') && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isMonthlyBill) markAsPaid(b);
                            else markInstallmentAsPaid(b);
                          }}
                          className="bg-primary text-on-primary px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/10"
                        >
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              allPaid.map(b => {
                const isMonthlyBill = b.itemType === 'bill';
                const paidDate = b.paid_at ? new Date(b.paid_at) : new Date();
                const day = paidDate.getDate().toString().padStart(2, '0');
                const month = MONTH_NAMES[paidDate.getMonth()].substring(0, 3);
                
                return (
                  <div key={b.id} className="bg-white/50 opacity-60 p-7 rounded-[2.5rem] flex items-center justify-between border border-surface-container/30 shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-tertiary-container/30 rounded-2xl flex items-center justify-center">
                        {b.itemType === 'installment' ? <CreditCard size={24} className="text-tertiary" /> :
                         getBillIcon(b.name).props && React.cloneElement(getBillIcon(b.name), { className: 'text-tertiary' })}
                      </div>
                      <div>
                        <p className="text-on-surface-variant font-bold text-base font-headline">{b.name}</p>
                        <p className="text-tertiary text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={14} fill="currentColor" className="opacity-80" />
                          {b.itemType === 'installment' ? 'Parcela paga este mês' : `Pago em ${day} ${month}`}
                        </p>
                        {b.isFromPreviousMonth && (
                          <span className="px-2 py-0.5 mt-1 inline-block rounded-full text-[9px] font-black bg-secondary/10 text-secondary uppercase tracking-widest">
                            {b.previousMonthName} (anterior)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-on-surface-variant font-black text-lg tracking-tight">{fmt(b.value)}</p>
                      <div className="bg-tertiary-container text-on-tertiary-container px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Pago
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {billTab === 'pending' && allPending.length === 0 && (
              <div className="p-10 text-center bg-white rounded-[2.5rem] border border-surface-container/30">
                <p className="text-on-surface-variant font-medium opacity-60">Nenhum vencimento para o momento!</p>
              </div>
            )}
            {billTab === 'paid' && allPaid.length === 0 && (
              <div className="p-10 text-center bg-white/50 rounded-[2.5rem] border border-surface-container/20">
                <p className="text-on-surface-variant font-medium opacity-60">Nenhuma conta paga este mês ainda.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── CATEGORY HIGHLIGHTS ── */}
        <section className="space-y-4">
          <h2 className="text-on-surface font-extrabold text-xl font-headline">Onde você mais gasta</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {summary?.by_category?.length > 0 ? (
              [...summary.by_category].sort((a,b) => b.count - a.count).map((cat: any, idx: number) => (
                <div key={cat.category} onClick={() => setSelectedCategory(cat.category)} className={`min-w-[140px] ${idx === 0 ? 'bg-secondary-container' : 'bg-white'} p-5 rounded-[2rem] flex flex-col items-center text-center space-y-3 shadow-sm cursor-pointer transition-transform hover:scale-105 active:scale-95`}>
                  <div className={`w-12 h-12 ${idx === 0 ? 'bg-white/30' : 'bg-surface-container-low'} rounded-full flex items-center justify-center text-xl`}>
                    {catEmoji(cat.category)}
                  </div>
                  <div>
                    <p className={`${idx === 0 ? 'text-on-secondary-container' : 'text-on-surface'} font-bold text-sm truncate`}>{cat.category}</p>
                    <p className={`${idx === 0 ? 'text-on-secondary-container opacity-70' : 'text-on-surface-variant'} text-[10px] font-bold uppercase tracking-widest`}>{cat.count} PAGOS</p>
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
            <button 
              onClick={() => onTabChange && onTabChange('history')}
              className="text-primary font-bold text-sm"
            >
              Ver todas
            </button>
          </div>
          <div className="bg-white rounded-[2.5rem] divide-y divide-surface-container-low shadow-sm border border-surface-container/30 overflow-hidden">
            {txs.slice(0, 5).map(t => {
              const isIncome = t.type === 'income';
              return (
                <div key={t.id} onClick={() => setSelectedTx(t)} className="p-6 flex items-center justify-between cursor-pointer active:bg-surface-container-low transition-colors hover:bg-surface-container-lowest">
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

      {/* FAB - REMOVED */}

      {/* MODALS */}
      {selectedTx && (
        <TransactionModal 
          tx={selectedTx} 
          onClose={() => setSelectedTx(null)}
          onRefresh={() => fetchData(true)}
        />
      )}

      {showFixedModal && (
        <FixedDetailsModal
          unpaidBills={pendingBills}
          installments={installments}
          tithingValue={tithing}
          onClose={() => setShowFixedModal(false)}
        />
      )}

      {selectedCategory && (
        <CategoryDetailsModal
          category={selectedCategory}
          period="month"
          userId={userId}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      {showIncomeModal && (
        <IncomeDetailsModal 
          userId={userId} 
          onClose={() => setShowIncomeModal(false)} 
        />
      )}

      {showTitheModal && titheSummary && (
        <TitheDetailsModal
          userId={userId}
          titheSummary={titheSummary}
          onClose={() => { setShowTitheModal(false); fetchData(true); }}
        />
      )}
    </div>
  );
};

export default Home;
