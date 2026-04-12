import React, { useState, useEffect } from 'react';
import { Target, Calendar, ChevronRight, User, Heart, LogOut, PlusCircle, Home, Wifi, Utensils, Zap, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import NewBillModal from '../components/NewBillModal';
import NewBudgetModal from '../components/NewBudgetModal';
import NewGoalModal from '../components/NewGoalModal';

const SectionHeader = ({ title, onAdd }: { title: string; onAdd?: () => void }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-headline text-xl font-extrabold tracking-tight text-on-background">{title}</h3>
    {onAdd && (
      <button 
        onClick={onAdd}
        className="text-primary text-sm font-bold flex items-center gap-1 active:scale-95 transition-transform"
      >
        <PlusCircle size={18} />
        Adicionar nova
      </button>
    )}
  </div>
);

const Settings = ({ 
  userId, 
  onUserChange, 
  userMetadata,
  onModalOpen,
  onModalClose
}: { 
  userId: string; 
  onUserChange: (u: string | null) => void;
  userMetadata?: { name?: string; avatar?: string } | null;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) => {
  const [fixed,   setFixed]   = useState<any[]>([]);
  const [goals,   setGoals]   = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [titheActive, setTitheActive] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [tithePercentage, setTithePercentage] = useState(10);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Modal states
  const [showNewBill, setShowNewBill] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showNewBudget, setShowNewBudget] = useState(false);

  useEffect(() => {
    if (showNewBill || showNewGoal || showNewBudget) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [showNewBill, showNewGoal, showNewBudget]);

  useEffect(() => { fetchData(); }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, gRes, bRes, sRes] = await Promise.all([
        fetch(`/api/monthly-bills?user_id=${userId}`),
        fetch(`/api/goals?user_id=${userId}`),
        fetch(`/api/budgets?user_id=${userId}`),
        fetch(`/api/transactions/summary?user_id=${userId}&period=month`)
      ]);
      const [fData, gData, bData, sData] = await Promise.all([
        fRes.json(), 
        gRes.json(), 
        bRes.json(),
        sRes.json()
      ]);
      setFixed(Array.isArray(fData) ? fData : []);
      setGoals(Array.isArray(gData) ? gData : []);
      setBudgets(Array.isArray(bData) ? bData : []);
      if (sData?.total_income) setTotalIncome(Number(sData.total_income));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onUserChange(null);
  };

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  const getBillIcon = (name: string) => {
    const low = name.toLowerCase();
    if (low.includes('aluguel')) return <Home size={20} className="text-primary" />;
    if (low.includes('internet') || low.includes('wifi')) return <Wifi size={20} className="text-primary" />;
    if (low.includes('luz') || low.includes('energia')) return <Zap size={20} className="text-primary" />;
    if (low.includes('água')) return <Utensils size={20} className="text-primary" />;
    return <Calendar size={20} className="text-primary" />;
  };

  return (
    <div className="screen bg-background">
      <header className="page-header pt-12 pb-4 px-6 sticky top-0 bg-background/80 backdrop-blur-lg z-50">
        <h1 className="font-headline tracking-tighter text-on-background text-4xl font-black">Ajustes</h1>
      </header>

      <main className="page-content px-6 space-y-10 mt-4 pb-32">
        
        {/* Profile Section */}
        <section className="py-8 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden flex-shrink-0 bg-surface-container-high">
              {userMetadata?.avatar ? (
                <img src={userMetadata.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                  <User size={48} />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1 mb-8">
            <div className="flex items-center justify-center gap-2">
              <h2 className="font-headline text-3xl font-black text-on-surface tracking-tight">
                {userMetadata?.name || 'Usuário Pera'}
              </h2>
              <button aria-label="Editar nome" className="text-on-surface-variant/40 hover:text-primary transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 text-on-surface-variant hover:text-error font-bold text-sm transition-colors py-2 px-6 rounded-full border border-outline-variant/30 active:scale-95"
          >
            <LogOut size={16} />
            Sair da conta
          </button>
        </section>

        {/* Tithe Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline text-xl font-extrabold tracking-tight text-on-background">Configuração de Dízimo</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={titheActive} 
                onChange={() => setTitheActive(!titheActive)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
              <span className="ms-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {titheActive ? 'Ativo' : 'Inativo'}
              </span>
            </label>
          </div>

          <div className={`bg-white rounded-[2rem] p-7 shadow-sm border border-surface-container transition-all overflow-hidden ${titheActive ? 'opacity-100 max-h-[500px]' : 'opacity-40 max-h-0 py-0 overflow-hidden text-transparent translate-y-4'}`}>
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] mb-2">Valor Calculado</p>
                <p className="font-headline text-3xl font-black text-primary leading-tight">
                  {fmt(totalIncome * (tithePercentage / 100))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] mb-2">Percentual</p>
                <p className="font-headline text-xl font-bold">{tithePercentage}%</p>
              </div>
            </div>

            <div className="mb-6">
              <input 
                type="range"
                min="0"
                max="100"
                step="1"
                value={tithePercentage}
                onChange={(e) => setTithePercentage(parseInt(e.target.value))}
                className="w-full h-2 bg-surface-container-low rounded-full appearance-none cursor-pointer accent-primary"
              />
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Baseado na sua renda mensal de <span className="font-bold text-on-background">{fmt(totalIncome)}</span>. O valor é provisionado automaticamente ao receber depósitos.
            </p>
          </div>
        </section>

        {/* Fixed Bills Section */}
        <section className="space-y-4">
          <SectionHeader title="Contas Fixas" onAdd={() => setShowNewBill(true)} />
          <div className="grid gap-3">
            {loading ? (
              <div className="skeleton h-20 w-full rounded-2xl" />
            ) : fixed.length === 0 ? (
              <p className="text-xs font-bold text-muted text-center py-4 uppercase tracking-widest">Nenhuma conta configurada</p>
            ) : (
              fixed.map(f => (
                <div key={f.id} className="bg-surface-container-low rounded-[1.5rem] p-5 flex justify-between items-center transition-all hover:translate-x-1 group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      {getBillIcon(f.name)}
                    </div>
                    <div>
                      <p className="font-bold text-on-background text-[15px]">{f.name}</p>
                      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Todo dia {f.due_day}</p>
                    </div>
                  </div>
                  <p className="font-headline font-black text-on-background">{fmt(f.value)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Savings Goals */}
        <section className="space-y-4">
          <SectionHeader title="Metas de Economia" onAdd={() => setShowNewGoal(true)} />
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="skeleton h-28 w-full rounded-2xl" />
            ) : goals.length === 0 ? (
              <p className="text-xs font-bold text-muted text-center py-4 uppercase tracking-widest">Nenhuma meta ativa</p>
            ) : (
              goals.map((g, idx) => {
                const pct = Math.min(g.percentage_progress || 0, 100);
                const isOdd = idx % 2 !== 0;
                return (
                  <div key={g.id} className={`bg-white rounded-[2rem] p-7 shadow-sm border-l-[6px] ${isOdd ? 'border-tertiary-container' : 'border-primary'}`}>
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <p className="font-headline font-bold text-lg text-on-background leading-tight mb-1">{g.name}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Meta de {fmt(g.target_value)}</p>
                      </div>
                      <span className={`font-black text-sm px-3 py-1 rounded-full ${isOdd ? 'bg-tertiary-container/20 text-tertiary' : 'bg-primary/10 text-primary'}`}>
                        {fmt(g.current_value || 0)}
                      </span>
                    </div>
                    <div className="h-2 bg-surface-container-low rounded-full mb-3">
                      <div className={`h-full rounded-full ${isOdd ? 'bg-tertiary-fixed' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] text-right">{Math.round(pct)}% Concluído</p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Budgets Section */}
        <section className="space-y-4">
          <SectionHeader title="Orçamentos Mensais" onAdd={() => setShowNewBudget(true)} />
          <div className="space-y-3">
            {loading ? (
              <div className="skeleton h-20 w-full rounded-2xl" />
            ) : budgets.length === 0 ? (
              <p className="text-xs font-bold text-muted text-center py-4 uppercase tracking-widest">Nenhum limite definido</p>
            ) : (
              budgets.map(b => {
                const rawPct = (b.spent / b.monthly_limit) * 100;
                const pct = Math.min(rawPct, 100);
                const over = rawPct > 100;

                return (
                  <div key={b.id} className="bg-surface-container-low rounded-[1.5rem] p-5">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${over ? 'bg-error' : 'bg-primary'}`} />
                        <p className="font-bold text-on-background">{b.category}</p>
                      </div>
                      <p className="text-[11px] font-bold text-on-surface-variant">
                        <span className={`font-black ${over ? 'text-error' : 'text-on-background'}`}>{fmt(b.spent)}</span> / {fmt(b.monthly_limit)}
                      </p>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${over ? 'bg-error-container' : 'bg-secondary-container'}`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </main>

      {/* Modals */}
      {showNewBill && (
        <NewBillModal 
          userId={userId} 
          onClose={() => setShowNewBill(false)} 
          onSuccess={fetchData} 
        />
      )}
      {showNewBudget && (
        <NewBudgetModal 
          userId={userId} 
          onClose={() => setShowNewBudget(false)} 
          onSuccess={fetchData} 
        />
      )}
      {showNewGoal && (
        <NewGoalModal 
          userId={userId} 
          onClose={() => setShowNewGoal(false)} 
          onSuccess={fetchData} 
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2 mb-8">
              <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">Sair da conta?</h2>
              <p className="font-body text-sm text-on-surface-variant/70">Tem certeza que deseja sair?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleLogout}
                className="w-full bg-error text-white py-4 rounded-full font-headline font-bold text-base shadow-lg shadow-error/20 active:scale-95 transition-all"
              >
                Sair
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full bg-transparent text-on-surface-variant py-3 rounded-full font-headline font-bold text-sm hover:text-on-surface active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
