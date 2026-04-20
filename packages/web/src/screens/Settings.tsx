import React, { useState, useEffect } from 'react';
import { Target, Calendar, ChevronRight, User, Heart, LogOut, PlusCircle, Home, Wifi, Utensils, Zap, HelpCircle, Coffee, Car, HeartPulse, Gamepad2, BookOpen, ReceiptText, Shirt, Smartphone, Hand, CircleEllipsis, Pencil } from 'lucide-react';
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
  const cachedActive = localStorage.getItem(`tithe_active_${userId}`);
  const cachedPct = localStorage.getItem(`tithe_pct_${userId}`);
  const [titheActive, setTitheActive] = useState<boolean>(cachedActive !== null ? cachedActive === 'true' : true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [categorySpending, setCategorySpending] = useState<any[]>([]);
  const [tithePercentage, setTithePercentage] = useState<number>(cachedPct !== null ? parseInt(cachedPct) : 10);
  const [editingPct, setEditingPct] = useState(false);
  const [pctInput, setPctInput] = useState<string>(String(cachedPct !== null ? parseInt(cachedPct) : 10));
  const [pctError, setPctError] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editBudget, setEditBudget] = useState<{ category: string; budget?: any } | null>(null);
  const [newLimit, setNewLimit] = useState('');

  // Modal states
  const [showNewBill, setShowNewBill] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showNewBudget, setShowNewBudget] = useState(false);

  // Tithe persistence handlers
  const handleTitheActiveChange = async (active: boolean) => {
    setTitheActive(active);
    localStorage.setItem(`tithe_active_${userId}`, String(active));
    await fetch('/api/user-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, tithe_active: active })
    });
  };

  const handleTithePercentageSave = async (pct: number) => {
    localStorage.setItem(`tithe_pct_${userId}`, String(pct));
    await fetch('/api/user-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, tithe_percentage: pct })
    });
  };

  useEffect(() => {
    if (showNewBill || showNewGoal || showNewBudget || showLogoutConfirm || editBudget) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [showNewBill, showNewGoal, showNewBudget, showLogoutConfirm, editBudget]);

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
      const [fRes, gRes, bRes, sRes, profileRes] = await Promise.all([
        fetch(`/api/monthly-bills?user_id=${userId}`),
        fetch(`/api/goals?user_id=${userId}`),
        fetch(`/api/budgets?user_id=${userId}`),
        fetch(`/api/transactions/summary?user_id=${userId}&period=month`),
        fetch(`/api/user-profile?user_id=${userId}`)
      ]);
      const [fData, gData, bData, sData, profileData] = await Promise.all([
        fRes.json(), 
        gRes.json(), 
        bRes.json(),
        sRes.json(),
        profileRes.json()
      ]);
      setFixed(Array.isArray(fData) ? fData : []);
      setGoals(Array.isArray(gData) ? gData : []);
      setBudgets(Array.isArray(bData) ? bData : []);
      if (sData?.total_income) setTotalIncome(Number(sData.total_income));
      if (sData?.by_category) setCategorySpending(sData.by_category);
      
      if (profileData?.tithe_percentage) {
        setTithePercentage(profileData.tithe_percentage);
        localStorage.setItem(`tithe_pct_${userId}`, String(profileData.tithe_percentage));
      }
      if (profileData?.tithe_active !== undefined) {
        setTitheActive(profileData.tithe_active);
        localStorage.setItem(`tithe_active_${userId}`, String(profileData.tithe_active));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
    } catch (e) {
      console.log('SignOut timeout ou erro, forçando logout:', e);
    } finally {
      // Limpar storage manualmente para garantir reset
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
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

  const CATEGORIES = [
    { name: "Alimentação", icon: <Utensils size={24} />, color: "bg-error-container/10", textColor: "text-error" },
    { name: "Fast Food", icon: <Coffee size={24} />, color: "bg-secondary-container/20", textColor: "text-secondary-dim" },
    { name: "Transporte", icon: <Car size={24} />, color: "bg-primary/10", textColor: "text-primary" },
    { name: "Saúde", icon: <HeartPulse size={24} />, color: "bg-error-container/10", textColor: "text-error" },
    { name: "Lazer", icon: <Gamepad2 size={24} />, color: "bg-secondary-container/20", textColor: "text-secondary-dim" },
    { name: "Educação", icon: <BookOpen size={24} />, color: "bg-primary/10", textColor: "text-primary" },
    { name: "Contas", icon: <ReceiptText size={24} />, color: "bg-surface-container-high", textColor: "text-on-surface" },
    { name: "Vestuário", icon: <Shirt size={24} />, color: "bg-secondary-container/10", textColor: "text-secondary-dim" },
    { name: "Eletrônicos", icon: <Smartphone size={24} />, color: "bg-primary/10", textColor: "text-primary" },
    { name: "Dízimo/Oferta", icon: <Hand size={24} />, color: "bg-tertiary-container/20", textColor: "text-on-tertiary-container" },
    { name: "Outros", icon: <CircleEllipsis size={24} />, color: "bg-surface-container-high", textColor: "text-on-surface" },
  ];

  const handleUpdateLimit = async () => {
    if (!editBudget) return;
    const value = parseFloat(newLimit);
    if (isNaN(value)) return;

    try {
      if (editBudget.budget?.id) {
        await fetch(`/api/budgets/${editBudget.budget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthly_limit: value })
        });
      } else {
        await fetch(`/api/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user_id: userId, 
            category: editBudget.category, 
            limit_value: value 
          })
        });
      }
      setEditBudget(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
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
                onChange={() => handleTitheActiveChange(!titheActive)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
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
              {editingPct ? (
                <div className="text-right">
                  <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] mb-2">Percentual</p>
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      type="number"
                      autoFocus
                      value={pctInput}
                      onChange={e => {
                        setPctInput(e.target.value);
                        const num = parseInt(e.target.value);
                        if (isNaN(num) || num < 10) {
                          setPctError('Mínimo 10%');
                        } else if (num > 100) {
                          setPctError('Máximo 100%');
                        } else {
                          setPctError('');
                        }
                      }}
                      onBlur={() => {
                        const num = parseInt(pctInput);
                        if (!isNaN(num) && num >= 10 && num <= 100) {
                          setTithePercentage(num);
                          handleTithePercentageSave(num);
                          setEditingPct(false);
                          setPctError('');
                        } else {
                          setPctError('Mínimo 10%');
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const num = parseInt(pctInput);
                          if (!isNaN(num) && num >= 10 && num <= 100) {
                            setTithePercentage(num);
                            handleTithePercentageSave(num);
                            setEditingPct(false);
                            setPctError('');
                          } else {
                            setPctError('Mínimo 10%');
                          }
                        }
                        if (e.key === 'Escape') {
                          setEditingPct(false);
                          setPctError('');
                        }
                      }}
                      className="w-16 text-right bg-surface-container-low rounded-xl px-2 py-1 font-headline text-xl font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="font-headline text-xl font-bold">%</span>
                  </div>
                  {pctError && (
                    <p className="text-error text-[10px] font-bold mt-1 text-right">{pctError}</p>
                  )}
                </div>
              ) : (
                <div className="text-right cursor-pointer" onClick={() => { setEditingPct(true); setPctInput(String(tithePercentage)); setPctError(''); }}>
                  <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] mb-2">Percentual</p>
                  <p className="font-headline text-xl font-bold flex items-center gap-1 justify-end">
                    {tithePercentage}%
                    <Pencil size={14} className="text-on-surface-variant opacity-40" />
                  </p>
                </div>
              )}
            </div>

            <div className="relative mb-6">
              <input 
                type="range"
                min="10"
                max="100"
                step="1"
                value={tithePercentage}
                onChange={(e) => setTithePercentage(parseInt(e.target.value))}
                onMouseUp={() => handleTithePercentageSave(tithePercentage)}
                onTouchEnd={() => handleTithePercentageSave(tithePercentage)}
                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${(tithePercentage - 10) / 90 * 100}%, var(--surface-container-low) ${(tithePercentage - 10) / 90 * 100}%)`
                }}
              />
              <div className="flex justify-between mt-2">
                <span className="text-[10px] font-bold text-on-surface-variant opacity-50">10%</span>
                <span className="text-[10px] font-bold text-on-surface-variant opacity-50">100%</span>
              </div>
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
          <SectionHeader title="Orçamentos Mensais" />
          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const budget = budgets.find(b => b.category === cat.name);
              const spending = categorySpending.find(s => s.category === cat.name);
              const spent = spending ? Number(spending.total) : (budget?.spent || 0);
              const limit = budget?.monthly_limit;
              
              const rawPct = limit ? (spent / limit) * 100 : 0;
              const pct = Math.min(rawPct, 100);
              const over = limit ? spent > limit : false;
              const excess = over ? spent - limit : 0;

              return (
                <div 
                  key={cat.name} 
                  className={`rounded-[2rem] p-7 shadow-sm border border-outline-variant/10 transition-all ${over ? 'bg-error-container/5 border-error-container/20' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${cat.name === 'Alimentação' && over ? 'bg-error-container/20' : cat.color} rounded-2xl flex items-center justify-center ${cat.textColor}`}>
                        {cat.icon}
                      </div>
                      <h4 className="font-headline font-bold text-xl text-on-surface tracking-tight">{cat.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${over ? 'text-error' : 'text-on-surface-variant'}`}>Gasto Atual</p>
                      <p className={`font-headline font-black text-2xl leading-none ${over ? 'text-error' : 'text-on-surface'}`}>
                        {fmt(spent).split(',')[0]}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="h-3 bg-surface-container-low rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-700 ease-out rounded-full ${over ? 'bg-error' : 'bg-primary'}`} 
                        style={{ width: `${limit ? pct : 0}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-xs font-bold leading-none ${over ? 'text-error' : 'text-on-surface-variant opacity-70'}`}>
                        {limit ? (
                          over ? `Limite excedido em ${fmt(excess)}` : `${Math.round(rawPct)}% do orçamento utilizado`
                        ) : (
                          'Sem limite definido'
                        )}
                      </p>
                      <button 
                        onClick={() => {
                          setEditBudget({ category: cat.name, budget });
                          setNewLimit(limit ? limit.toString() : '');
                        }}
                        className="flex items-center gap-2 hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all group active:scale-95"
                      >
                        <span className="text-[11px] font-black uppercase tracking-wider text-on-surface">
                          Limite: <span className="text-primary">{limit ? fmt(limit) : '---'}</span>
                        </span>
                        <Pencil size={14} className="text-primary group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowLogoutConfirm(false)}>
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

      {/* Edit Budget Limit Modal */}
      {editBudget && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setEditBudget(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2 mb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Configurar Limite</p>
              <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">
                {editBudget.category}
              </h2>
            </div>
            
            <div className="mb-8">
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-headline font-bold text-on-surface-variant opacity-50">R$</span>
                <input 
                  type="number"
                  autoFocus
                  value={newLimit}
                  onChange={e => setNewLimit(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-16 bg-surface-container-low border-none rounded-2xl px-12 font-headline font-black text-2xl text-on-surface focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleUpdateLimit}
                className="w-full bg-primary text-white py-4 rounded-full font-headline font-bold text-base shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Salvar Limite
              </button>
              <button 
                onClick={() => setEditBudget(null)}
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
