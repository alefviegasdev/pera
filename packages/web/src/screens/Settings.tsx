import React, { useState, useEffect, useRef } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Target, Calendar, ChevronRight, User, Heart, LogOut, PlusCircle, Home, Wifi, Utensils, Zap, HelpCircle, Coffee, Car, HeartPulse, Gamepad2, BookOpen, ReceiptText, Shirt, Smartphone, Hand, CircleEllipsis, Pencil, GripVertical, CreditCard, Trash2, X, CheckCircle2, Copy, MessageCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BANK_COLORS } from '../utils/categories';
import NewBillModal from '../components/NewBillModal';
import NewBudgetModal from '../components/NewBudgetModal';
import NewGoalModal from '../components/NewGoalModal';

const BANKS = ['Nubank', 'Itaú', 'Bradesco', 'Inter', 'C6 Bank', 'Santander', 'Caixa', 'Banco do Brasil', 'XP', 'BTG'];

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

const CategoryCardItem = ({ 
  cat, 
  budget, 
  spending, 
  fmt, 
  setEditBudget, 
  setNewLimit 
}: any) => {
  const controls = useDragControls();
  const spent = spending ? Number(spending.total) : (budget?.spent || 0);
  const limit = budget?.monthly_limit;
  const rawPct = limit ? (spent / limit) * 100 : 0;
  const pct = Math.min(rawPct, 100);
  const over = limit ? spent > limit : false;
  const excess = over ? spent - limit : 0;

  return (
    <Reorder.Item
      value={cat}
      dragListener={false}
      dragControls={controls}
      className={`rounded-[2rem] p-7 shadow-sm border border-outline-variant/10 transition-colors bg-white relative ${over ? '!bg-error-container/5 !border-error-container/20' : ''}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div 
            onPointerDown={(e) => controls.start(e)}
            style={{ touchAction: "none" }}
            className="text-on-surface-variant/30 flex items-center justify-center cursor-grab active:cursor-grabbing active:scale-90 active:text-primary transition-all p-2 -ml-2 select-none"
          >
            <GripVertical size={20} />
          </div>
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
    </Reorder.Item>
  );
};


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
  const [titheableIncome, setTitheableIncome] = useState(0);
  const [categorySpending, setCategorySpending] = useState<any[]>([]);
  const [tithePercentage, setTithePercentage] = useState<number>(cachedPct !== null ? parseInt(cachedPct) : 10);
  const [editingPct, setEditingPct] = useState(false);
  const [pctInput, setPctInput] = useState<string>(String(cachedPct !== null ? parseInt(cachedPct) : 10));
  const [pctError, setPctError] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editBudget, setEditBudget] = useState<{ category: string; budget?: any } | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [pendingPct, setPendingPct] = useState<number | null>(null);
  const [savedPct, setSavedPct] = useState<number>(
    cachedPct !== null ? parseInt(cachedPct) : 10
  );

  // Telegram Integration states
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramCode, setTelegramCode] = useState<string>('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [telegramCopied, setTelegramCopied] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const [telegramSuccess, setTelegramSuccess] = useState(false);
  const telegramPollingRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (telegramPollingRef.current) clearInterval(telegramPollingRef.current);
    };
  }, []);

  const generateNewTelegramCode = async () => {
    setTelegramLoading(true);
    setTelegramError('');
    setTelegramSuccess(false);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setTelegramCode(code);

    try {
      const response = await fetch('/api/user-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: userId, 
          link_code: code,
          telegram_id: null,
          linked_at: null 
        })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setTelegramId(null);
    } catch (error) {
      console.error('Falha ao gerar código do Telegram:', error);
      setTelegramError('Falha ao gerar o código. Tente novamente.');
    } finally {
      setTelegramLoading(false);
    }
  };

  const startTelegramPolling = () => {
    console.log('[TELEGRAM POLLING] iniciando...');
    if (telegramPollingRef.current) clearInterval(telegramPollingRef.current);
    
    setTelegramChecking(true);
    setTelegramError('');
    setTelegramSuccess(false);
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('telegram_id')
          .eq('user_id', userId)
          .maybeSingle();
        
        console.log('[TELEGRAM POLLING] data:', JSON.stringify(data));
        
        if (data?.telegram_id) {
          clearInterval(interval);
          telegramPollingRef.current = null;
          setTelegramChecking(false);
          setTelegramId(data.telegram_id);
          setTelegramSuccess(true);
        } else if (attempts >= 60) {
          clearInterval(interval);
          telegramPollingRef.current = null;
          setTelegramChecking(false);
          setTelegramError('O tempo se esgotou. Envie o código no Telegram e tente novamente.');
        }
      } catch (e) { 
        console.log('Telegram polling error:', e); 
      }
    }, 3000);
    
    telegramPollingRef.current = interval;
  };

  const stopTelegramPolling = () => {
    if (telegramPollingRef.current) {
      clearInterval(telegramPollingRef.current);
      telegramPollingRef.current = null;
    }
    setTelegramChecking(false);
  };

  const handleCloseTelegramModal = () => {
    stopTelegramPolling();
    setShowTelegramModal(false);
    setTelegramError('');
    setTelegramSuccess(false);
  };

  const handleCopyTelegramCode = () => {
    if (!telegramCode) return;
    navigator.clipboard.writeText(telegramCode);
    setTelegramCopied(true);
    setTimeout(() => setTelegramCopied(false), 2000);
  };

  // Modal states
  const [showNewBill, setShowNewBill] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [showNewBudget, setShowNewBudget] = useState(false);

  // Credit card states
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [defaultPayment, setDefaultPayment] = useState<'debit' | 'credit'>('debit');
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('Nubank');
  const [cardLimit, setCardLimit] = useState('');
  const [cardClosingDay, setCardClosingDay] = useState(1);
  const [cardDueDay, setCardDueDay] = useState(10);
  const [savingCard, setSavingCard] = useState(false);
  const cardModalContentRef = useRef<HTMLDivElement>(null);
  const [cardDragOffset, setCardDragOffset] = useState(0);
  const [cardDragStartY, setCardDragStartY] = useState<number | null>(null);

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
    if (showNewBill || showNewGoal || showNewBudget || showLogoutConfirm || editBudget || showCardModal) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [showNewBill, showNewGoal, showNewBudget, showLogoutConfirm, editBudget, showCardModal]);

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
      const [fRes, gRes, bRes, sRes, profileRes, titheSummaryRes, ccRes] = await Promise.all([
        fetch(`/api/fixed-expenses?user_id=${userId}`),
        fetch(`/api/goals?user_id=${userId}`),
        fetch(`/api/budgets?user_id=${userId}`),
        fetch(`/api/transactions/summary?user_id=${userId}&period=month`),
        fetch(`/api/user-profile?user_id=${userId}`),
        fetch(`/api/tithe-summary?user_id=${userId}`),
        fetch(`/api/credit-cards?user_id=${userId}`)
      ]);
      const [fData, gData, bData, sData, profileData, titheSummaryData] = await Promise.all([
        fRes.json(), 
        gRes.json(), 
        bRes.json(),
        sRes.json(),
        profileRes.json(),
        titheSummaryRes.json()
      ]);
      try { const ccData = await ccRes.json(); setCreditCards(Array.isArray(ccData) ? ccData : []); } catch { setCreditCards([]); }
      setFixed(Array.isArray(fData) ? fData : []);
      setGoals(Array.isArray(gData) ? gData : []);
      setBudgets(Array.isArray(bData) ? bData : []);
      if (sData?.total_income) setTotalIncome(Number(sData.total_income));
      if (titheSummaryData?.total_titheable) setTitheableIncome(Number(titheSummaryData.total_titheable));
      if (sData?.by_category) setCategorySpending(sData.by_category);
      if (profileData?.default_payment) setDefaultPayment(profileData.default_payment);
      
      if (profileData?.tithe_percentage) {
        setTithePercentage(profileData.tithe_percentage);
        setSavedPct(profileData.tithe_percentage);
        localStorage.setItem(`tithe_pct_${userId}`, String(profileData.tithe_percentage));
      }
      if (profileData?.tithe_active !== undefined) {
        setTitheActive(profileData.tithe_active);
        localStorage.setItem(`tithe_active_${userId}`, String(profileData.tithe_active));
      }

      const { data: tgData } = await supabase
        .from('user_profiles')
        .select('telegram_id')
        .eq('user_id', userId)
        .maybeSingle();
      setTelegramId(tgData?.telegram_id || null);
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

  const DEFAULT_CATEGORIES = [
    { name: "Alimentação", icon: <Utensils size={24} />, color: "bg-error-container/10", textColor: "text-error" },
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

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem(`budget_categories_order_${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = parsed.map((name: string) => DEFAULT_CATEGORIES.find(c => c.name === name)).filter(Boolean);
        DEFAULT_CATEGORIES.forEach(c => {
          if (!merged.find((m: any) => m.name === c.name)) merged.push(c);
        });
        return merged as typeof DEFAULT_CATEGORIES;
      } catch(e) {}
    }
    return DEFAULT_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem(`budget_categories_order_${userId}`, JSON.stringify(categories.map(c => c.name)));
  }, [categories, userId]);

  const anyModalOpen = showCardModal || showNewBill || !!editingBill || showNewGoal || showNewBudget || !!editBudget || pendingPct !== null || showLogoutConfirm || !!deletingCardId || showTelegramModal;

  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      const appShell = document.getElementById('app-shell');
      if (appShell) appShell.style.overflow = 'hidden';
      onModalOpen?.();
    } else {
      document.body.style.overflow = '';
      const appShell = document.getElementById('app-shell');
      if (appShell) appShell.style.overflow = '';
      onModalClose?.();
    }
  }, [anyModalOpen, onModalOpen, onModalClose]);

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


        {/* Payment Preference + Credit Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline text-xl font-extrabold tracking-tight text-on-background">Pagamento Padrão</h3>
            <div className="flex bg-surface-container rounded-2xl p-1 gap-1">
              {(['debit', 'credit'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={async () => {
                    setDefaultPayment(opt);
                    await fetch('/api/user-profile', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_id: userId, default_payment: opt })
                    });
                  }}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    defaultPayment === opt
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant opacity-50'
                  }`}
                >
                  {opt === 'debit' ? 'Débito' : 'Crédito'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-headline text-xl font-extrabold tracking-tight text-on-background">Cartões de Crédito</h3>
              <button
                onClick={() => {
                  setEditingCard(null);
                  setCardName(''); setCardBank('Nubank'); setCardLimit('');
                  setCardClosingDay(1); setCardDueDay(10);
                  setShowCardModal(true);
                }}
                className="text-primary text-sm font-bold flex items-center gap-1 active:scale-95 transition-transform"
              >
                <PlusCircle size={18} />
                Adicionar
              </button>
            </div>

            {creditCards.length === 0 ? (
              <p className="text-xs font-bold text-center py-4 uppercase tracking-widest text-on-surface-variant opacity-40">Nenhum cartão cadastrado</p>
            ) : (
              <div className="grid gap-3">
                {creditCards.map(card => {
                  const colors = BANK_COLORS[card.bank] || {
                    from: '#1a1a2e',
                    to: '#16213e',
                    text: '#ffffff'
                  };
                  return (
                    <div key={card.id} className="bg-white rounded-[2rem] p-5 flex items-center justify-between shadow-sm border border-surface-container/50 cursor-pointer active:scale-[0.98] transition-all"
                      onClick={() => {
                        setEditingCard(card);
                        setCardName(card.name || '');
                        const matchedBank = BANKS.find(b =>
                          b.toLowerCase() === (card.bank || '').toLowerCase() ||
                          b.toLowerCase().includes((card.bank || '').toLowerCase()) ||
                          (card.bank || '').toLowerCase().includes(b.toLowerCase())
                        );
                        setCardBank(matchedBank || card.bank || 'Nubank');
                        setCardLimit(String(card.card_limit || ''));
                        setCardClosingDay(card.closing_day || 1);
                        setCardDueDay(card.due_day || 10);
                        setShowCardModal(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                        >
                          <CreditCard size={18} style={{ color: colors.text }} />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-base leading-tight">{card.name || card.bank}</p>
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                            {card.bank} · Limite {(Number(card.card_limit) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingCardId(card.id); }}
                        className="p-2 rounded-full text-on-surface-variant/30 hover:text-error hover:bg-error/5 transition-all active:scale-90"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                  {fmt(titheableIncome * (tithePercentage / 100))}
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
                          setEditingPct(false);
                          setPctError('');
                          if (num !== savedPct) setPendingPct(num);
                        } else {
                          // Resetar para o último valor válido em vez de manter o inválido
                          setPctInput(String(tithePercentage));
                          setPctError('');
                          setEditingPct(false);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const num = parseInt(pctInput);
                          if (!isNaN(num) && num >= 10 && num <= 100) {
                            setTithePercentage(num);
                            setPendingPct(num);
                            setEditingPct(false);
                            setPctError('');
                          } else {
                            setPctInput(String(tithePercentage));
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
                onMouseUp={(e) => {
                  const val = parseInt((e.target as HTMLInputElement).value);
                  if (val !== savedPct) setPendingPct(val);
                }}
                onTouchEnd={(e) => {
                  const val = parseInt((e.target as HTMLInputElement).value);
                  if (val !== savedPct) setPendingPct(val);
                }}
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
              Baseado em <span className="font-bold text-on-background">{fmt(titheableIncome)}</span> em recebimentos computáveis este mês. O valor é provisionado automaticamente ao receber depósitos.
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
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Todo dia {f.due_day}</p>
                        {f.variable_value && (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                            Variável
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-headline font-black text-on-background">{fmt(f.value)}</p>
                    <button
                      onClick={() => setEditingBill(f)}
                      className="p-2.5 bg-surface-container-high rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 hover:shadow-sm transition-all active:scale-90"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
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
          <Reorder.Group axis="y" values={categories} onReorder={setCategories} className="space-y-4">
            {categories.map(cat => {
              const budget = budgets.find(b => b.category === cat.name);
              const spending = categorySpending.find(s => s.category === cat.name);
              
              return (
                <CategoryCardItem 
                  key={cat.name} 
                  cat={cat} 
                  budget={budget} 
                  spending={spending} 
                  fmt={fmt} 
                  setEditBudget={setEditBudget} 
                  setNewLimit={setNewLimit} 
                />
              );
            })}
          </Reorder.Group>
        </section>

        {/* Telegram Integration Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline text-xl font-extrabold tracking-tight text-on-background">Telegram</h3>
            {telegramId ? (
              <span className="chip chip-success">Conectado</span>
            ) : (
              <span className="chip chip-warning">Não conectado</span>
            )}
          </div>
          
          <div className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-surface-container flex flex-col gap-4">
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              {telegramId 
                ? 'Seu app Pera está conectado ao Telegram. Você pode reintegrar com outro chat ou refazer a conexão a qualquer momento.'
                : 'Conecte o Pera ao seu Telegram para receber alertas, cadastrar transações por texto ou áudio e consultar relatórios instantâneos.'
              }
            </p>
            
            <button
              onClick={() => {
                setShowTelegramModal(true);
                generateNewTelegramCode();
              }}
              className="w-full h-14 bg-primary text-on-primary rounded-full font-headline font-black text-base shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>🍐</span>
              {telegramId ? 'Reintegrar Telegram' : 'Vincular Telegram'}
            </button>
          </div>
        </section>

      </main>

      {/* Card Modal */}
      {showCardModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999] flex items-end justify-center"
          onClick={() => setShowCardModal(false)}
        >
          <div
            className="w-full max-w-lg bg-surface rounded-t-[3.5rem] flex flex-col"
            style={{ height: '85dvh', transform: cardDragOffset > 0 ? `translateY(${cardDragOffset}px)` : undefined, transition: cardDragOffset > 0 ? 'none' : 'transform 0.3s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="pt-3 pb-6 flex-shrink-0"
              onTouchStart={e => setCardDragStartY(e.touches[0].clientY)}
              onTouchMove={e => {
                if (cardModalContentRef.current && cardModalContentRef.current.scrollTop > 0) return;
                if (cardDragStartY !== null) {
                  const delta = e.touches[0].clientY - cardDragStartY;
                  if (delta > 0) setCardDragOffset(delta);
                }
              }}
              onTouchEnd={() => {
                if (cardDragOffset > 120) setShowCardModal(false);
                setCardDragOffset(0); setCardDragStartY(null);
              }}
            >
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mt-1 mb-6 flex-shrink-0" />
              <div className="px-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</p>
                <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">{editingCard ? 'Editar Cartão' : 'Adicionar Cartão'}</h2>
              </div>
            </div>

            <div ref={cardModalContentRef} className="flex-1 overflow-y-auto px-6 pb-8 space-y-6 scrollbar-hide">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Banco</label>
                  <select
                    value={cardBank}
                    onChange={e => setCardBank(e.target.value)}
                    className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                  >
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Limite (R$)</label>
                  <input
                    type="number"
                    value={cardLimit}
                    onChange={e => setCardLimit(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Fechamento</label>
                    <select
                      value={cardClosingDay}
                      onChange={e => setCardClosingDay(Number(e.target.value))}
                      className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Dia {d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Vencimento</label>
                    <select
                      value={cardDueDay}
                      onChange={e => setCardDueDay(Number(e.target.value))}
                      className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Dia {d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  disabled={savingCard || !cardBank}
                  onClick={async () => {
                    setSavingCard(true);
                    try {
                      if (editingCard) {
                        await fetch(`/api/credit-cards/${editingCard.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: cardBank,
                            bank: cardBank,
                            card_limit: parseFloat(cardLimit) || 0,
                            closing_day: cardClosingDay,
                            due_day: cardDueDay
                          })
                        });
                      } else {
                        await fetch('/api/credit-cards', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            user_id: userId,
                            name: cardBank,
                            bank: cardBank,
                            card_limit: parseFloat(cardLimit) || 0,
                            closing_day: cardClosingDay,
                            due_day: cardDueDay
                          })
                        });
                      }
                      setShowCardModal(false);
                      setEditingCard(null);
                      fetchData(true);
                    } catch (e) { console.error(e); }
                    finally { setSavingCard(false); }
                  }}
                  className="w-full h-14 bg-primary text-on-primary rounded-full font-headline font-black text-base shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {savingCard ? 'Salvando...' : (editingCard ? 'Salvar Alterações' : 'Adicionar Cartão')}
                </button>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="w-full py-3 text-on-surface-variant font-bold text-sm active:scale-95 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Card Confirmation */}
      {deletingCardId && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6" onClick={() => setDeletingCardId(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2 mb-8">
              <div className="w-14 h-14 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-error" />
              </div>
              <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">Remover cartão?</h2>
              <p className="text-sm text-on-surface-variant/70">O histórico de faturas não será apagado.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await fetch(`/api/credit-cards/${deletingCardId}`, { method: 'DELETE' });
                  setDeletingCardId(null);
                  fetchData(true);
                }}
                className="w-full bg-error text-white py-4 rounded-full font-headline font-bold text-base shadow-lg shadow-error/20 active:scale-95 transition-all"
              >
                Remover
              </button>
              <button
                onClick={() => setDeletingCardId(null)}
                className="w-full py-3 text-on-surface-variant font-bold text-sm active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showNewBill || editingBill) && (
        <NewBillModal 
          userId={userId} 
          initialData={editingBill}
          onClose={() => { setShowNewBill(false); setEditingBill(null); }} 
          onSuccess={() => { fetchData(); setEditingBill(null); setShowNewBill(false); }} 
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

      {pendingPct !== null && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-6" onClick={() => setPendingPct(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <p className="text-2xl mb-3">🙏</p>
              <h3 className="font-headline text-xl font-black text-on-surface mb-2">Aplicar {pendingPct}%</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Como deseja aplicar a nova porcentagem?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  // Salva % anterior + data de agora como ponto de corte
                  await fetch('/api/user-profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: userId,
                      tithe_percentage: pendingPct,
                      tithe_percentage_previous: savedPct, // % atual vira "anterior"
                      tithe_percentage_changed_at: new Date().toISOString()
                    })
                  });
                  localStorage.setItem(`tithe_pct_${userId}`, String(pendingPct));
                  setSavedPct(pendingPct);
                  setTithePercentage(pendingPct);
                  setPendingPct(null);
                }}
                className="w-full bg-surface-container-low text-on-surface py-4 rounded-[1.5rem] font-bold text-sm active:scale-95 transition-all text-left px-6 border-2 border-surface-container"
              >
                <p className="font-black">A partir dos próximos recebimentos</p>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Recebimentos anteriores mantêm o percentual antigo</p>
              </button>
              <button
                onClick={async () => {
                  // Ponto de corte = início do mês atual
                  const startOfMonth = new Date();
                  startOfMonth.setDate(1);
                  startOfMonth.setHours(0, 0, 0, 0);
                  
                  await fetch('/api/user-profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: userId,
                      tithe_percentage: pendingPct,
                      tithe_percentage_previous: savedPct,
                      tithe_percentage_changed_at: startOfMonth.toISOString()
                    })
                  });
                  localStorage.setItem(`tithe_pct_${userId}`, String(pendingPct));
                  setSavedPct(pendingPct);
                  setTithePercentage(pendingPct);
                  setPendingPct(null);
                }}
                className="w-full bg-primary text-on-primary py-4 rounded-full font-bold text-sm active:scale-95 transition-all text-left px-6 shadow-lg shadow-primary/20"
              >
                <p className="font-black">Aplicar ao mês atual</p>
                <p className="text-xs text-on-primary/70 font-medium mt-0.5">Recalcula com base nos recebimentos deste mês</p>
              </button>
              <button
                onClick={() => {
                  setTithePercentage(savedPct); // reverter visual
                  setPendingPct(null);
                }}
                className="w-full text-on-surface-variant py-3 rounded-full font-bold text-sm active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => handleCloseTelegramModal()}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden" onClick={e => e.stopPropagation()}>

            {telegramSuccess ? (
              /* ── SUCCESS STATE ── */
              <div className="flex flex-col items-center text-center gap-6 py-4">
                <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-[#22c55e]" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">Telegram vinculado!</h2>
                  <p className="text-sm text-on-surface-variant/70">Seu bot está pronto para usar. 🎉</p>
                </div>
                <button
                  onClick={() => handleCloseTelegramModal()}
                  className="w-full h-14 bg-[#22c55e] text-white rounded-full font-headline font-black text-base shadow-lg shadow-[#22c55e]/20 active:scale-95 transition-all"
                >
                  Ótimo!
                </button>
              </div>
            ) : (
              /* ── DEFAULT STATE ── */
              <>
                <button 
                  onClick={() => handleCloseTelegramModal()}
                  className="absolute top-6 right-6 p-2 rounded-full text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container transition-all"
                >
                  <X size={20} />
                </button>

                <div className="text-center space-y-2 mb-6">
                  <span className="text-3xl">🍐</span>
                  <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">Conectar Telegram</h2>
                  <p className="text-xs text-on-surface-variant/70">
                    Siga os passos abaixo para vincular o bot.
                  </p>
                </div>

                {/* Code display */}
                <div className="bg-surface-container-low p-6 rounded-3xl border border-surface-container relative overflow-hidden mb-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Seu código de vínculo</p>
                  
                  {telegramLoading ? (
                    <div className="h-12 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    <div 
                      onClick={handleCopyTelegramCode}
                      className="flex items-center justify-center gap-3 cursor-pointer group hover:scale-[1.02] transition-transform"
                    >
                      <div className="font-display text-4xl font-black tracking-[0.15em] text-on-surface">
                        {telegramCode}
                      </div>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${telegramCopied ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-primary group-hover:bg-primary group-hover:text-white'}`}>
                        {telegramCopied ? <CheckCircle2 size={16} /> : <Copy size={14} />}
                      </div>
                    </div>
                  )}
                  {telegramCopied && <p className="text-tertiary font-bold text-[9px] mt-1">Código copiado!</p>}
                </div>

                {/* Steps */}
                <div className="space-y-2.5 mb-6 text-left">
                  {[
                    { 
                      icon: <MessageCircle size={16} />, 
                      text: 'Abra o bot no Telegram', 
                      color: 'bg-primary/10',
                      link: 'https://t.me/pera_gardenbot'
                    },
                    { icon: <Zap size={16} />, text: 'Envie o código de 6 dígitos acima', color: 'bg-secondary-container/20' },
                    { icon: <ShieldCheck size={16} />, text: 'A conexão será feita de forma segura', color: 'bg-tertiary-container/20' }
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-low border border-surface-container/50 rounded-2xl">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.color} text-primary`}>
                        {step.icon}
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-on-surface-variant leading-tight">{step.text}</p>
                        {step.link && (
                          <a 
                            href={step.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary font-black text-[9px] uppercase tracking-widest bg-primary/5 px-2.5 py-1 rounded-full hover:bg-primary/10 transition-colors"
                          >
                            Abrir
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions & Polling Status */}
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={startTelegramPolling}
                    disabled={telegramChecking || telegramLoading}
                    className="w-full h-14 bg-primary text-on-primary rounded-full font-headline font-black text-base shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {telegramChecking ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verificando vínculo...</span>
                      </>
                    ) : (
                      <span>Já enviei o código</span>
                    )}
                  </button>

                  {telegramChecking && (
                    <button 
                      onClick={stopTelegramPolling}
                      className="text-white font-extrabold text-[9px] uppercase tracking-[0.2em] py-2 px-6 self-center bg-error rounded-full cursor-pointer active:scale-95 transition-transform"
                    >
                      Parar verificação
                    </button>
                  )}

                  {telegramError && (
                    <p className="text-error font-bold text-[11px] text-center p-2.5 bg-error/5 border border-error/10 rounded-xl">{telegramError}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
