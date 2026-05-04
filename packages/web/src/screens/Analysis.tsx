import React, { useState, useEffect, useRef } from 'react';
import { catColor, catEmoji } from '../utils/categories';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Eye,
  EyeOff,
  Plus,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import CategoryDetailsModal from '../components/CategoryDetailsModal';
import DateRangeModal from '../components/DateRangeModal';
import { motion } from 'framer-motion';

type ViewMode = 'subtype' | 'urgency' | 'category';

const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "#4CAF50",
  "Fast Food": "#FF5722",
  "Transporte": "#2196F3",
  "Saúde": "#E91E63",
  "Lazer": "#9C27B0",
  "Educação": "#3F51B5",
  "Contas": "#607D8B",
  "Vestuário": "#FF9800",
  "Eletrônicos": "#00BCD4",
  "Dízimo/Oferta": "#8BC34A",
  "Outros": "#9E9E9E"
};

const Analysis = ({ 
  userId,
  onModalOpen,
  onModalClose
}: { 
  userId: string;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) => {
  const [summary, setSummary] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [period, setPeriod] = useState(() => sessionStorage.getItem('pera_shared_period') || '7days');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('subtype');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const [hideAnalysis, setHideAnalysis] = useState(false);
  const [legendMode, setLegendMode] = useState<'value' | 'percentage'>('value');
  const [showDateModal, setShowDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string | null>(() => sessionStorage.getItem('pera_shared_start_date'));
  const [customEndDate, setCustomEndDate] = useState<string | null>(() => sessionStorage.getItem('pera_shared_end_date'));

  // Shopping List States
  const [listOpen, setListOpen] = useState<boolean>(() => {
    return localStorage.getItem(`shopping_list_open_${userId}`) !== 'false';
  });
  const [listItems, setListItems] = useState<{id: string; text: string; checked: boolean}[]>([]);
  const [newItem, setNewItem] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState<string>('');

  // Persistence
  useEffect(() => {
    sessionStorage.setItem('pera_shared_period', period);
    if (customStartDate) sessionStorage.setItem('pera_shared_start_date', customStartDate);
    else sessionStorage.removeItem('pera_shared_start_date');
    if (customEndDate) sessionStorage.setItem('pera_shared_end_date', customEndDate);
    else sessionStorage.removeItem('pera_shared_end_date');
  }, [period, customStartDate, customEndDate]);

  // On mount (tab switch), read master and reset local state
  useEffect(() => {
    const master = localStorage.getItem('pera_hide_master') === 'true';
    setHideAnalysis(master);
  }, []);

  const toggleHideAnalysis = () => {
    setHideAnalysis(prev => !prev);
  };

  const maskValue = (value: string, hide: boolean) => hide ? '•••••' : value;

  useEffect(() => { fetchData(); fetchShoppingList(); }, [userId, period, customStartDate, customEndDate]);
  
  const periodRef = React.useRef(period);
  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
      fetchShoppingList();
    }, 15000);
    return () => clearInterval(interval);
  }, [userId, period, customStartDate, customEndDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDateModal) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [showDateModal, onModalOpen, onModalClose]);

  const fetchShoppingList = async () => {
    try {
      const res = await fetch(`/api/shopping-list?user_id=${userId}`);
      const data = await res.json();
      setListItems(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const toggleList = () => {
    const next = !listOpen;
    setListOpen(next);
    localStorage.setItem(`shopping_list_open_${userId}`, String(next));
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, text: newItem.trim() })
      });
      const data = await res.json();
      setListItems(prev => [...prev, data]);
      setNewItem('');
    } catch (e) { console.error(e); }
  };

  const toggleItem = async (id: string) => {
    const item = listItems.find(i => i.id === id);
    if (!item) return;
    setListItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
    try {
      await fetch(`/api/shopping-list/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: !item.checked })
      });
    } catch (e) { console.error(e); }
  };

  const removeChecked = async () => {
    try {
      await fetch(`/api/shopping-list/checked?user_id=${userId}`, { method: 'DELETE' });
      setListItems(prev => prev.filter(i => !i.checked));
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/shopping-list/${id}`, { method: 'DELETE' });
      setListItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  };

  const hasChecked = listItems.some(i => i.checked);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const summaryUrl = period === 'custom' && customStartDate && customEndDate
        ? `/api/transactions/summary?user_id=${userId}&start_date=${customStartDate}&end_date=${customEndDate}`
        : `/api/transactions/summary?user_id=${userId}&period=${period}`;
      const txsUrl = period === 'custom' && customStartDate && customEndDate
        ? `/api/transactions?user_id=${userId}&start_date=${customStartDate}&end_date=${customEndDate}`
        : `/api/transactions?user_id=${userId}&period=${period}`;
      const [summaryRes, txsRes] = await Promise.all([
        fetch(summaryUrl),
        fetch(txsUrl)
      ]);
      setSummary(await summaryRes.json());
      const txsData = await txsRes.json();
      // Filter only expenses for composition
      setTxs((txsData.transactions || []).filter((t: any) => t.type === 'expense'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  const getCompositionData = () => {
    if (!txs.length) return [];
    const total = txs.reduce((acc, t) => acc + t.value, 0);
    const groups: Record<string, { value: number; color: string; label: string }> = {};

    if (viewMode === 'subtype') {
      txs.forEach(t => {
        const label = t.subtype === 'fixed' ? 'Fixos' : t.subtype === 'semifixed' ? 'Semi-fixos' : 'Únicos';
        const color = t.subtype === 'fixed' ? '#4A7FE5' : t.subtype === 'semifixed' ? '#A5A5A5' : '#7CB342';
        if (!groups[label]) groups[label] = { value: 0, color, label };
        groups[label].value += t.value;
      });
    } else if (viewMode === 'urgency') {
      txs.forEach(t => {
        const label = t.urgency === 'urgent' ? 'Urgentes' : t.urgency === 'necessity' ? 'Necessidades' : 'Secundários';
        const color = t.urgency === 'urgent' ? '#FF5252' : t.urgency === 'necessity' ? '#FFC107' : '#8BC34A';
        if (!groups[label]) groups[label] = { value: 0, color, label };
        groups[label].value += t.value;
      });
    } else {
      txs.forEach(t => {
        const label = t.category;
        const color = CATEGORY_COLORS[t.category] || '#9E9E9E';
        if (!groups[label]) groups[label] = { value: 0, color, label };
        groups[label].value += t.value;
      });
    }

    return Object.values(groups)
      .sort((a, b) => b.value - a.value)
      .map(g => ({
        ...g,
        percentage: total > 0 ? (g.value / total) * 100 : 0
      }));
  };

  const composition = getCompositionData();



  const periods = [
    { id: 'today', label: 'Hoje' },
    { id: 'yesterday', label: 'Ontem' },
    { id: 'week', label: 'Esta semana' },
    { id: '7days', label: '7 dias' },
    { id: 'month', label: 'Este mês' },
    { id: 'last_month', label: 'Mês passado' },
    { id: 'all', label: 'Total' },
    { id: 'custom', label: 'Personalizado' },
  ];


  const getCustomLabel = () => {
    if (period === 'custom' && customStartDate && customEndDate) {
      const s = customStartDate.split('-');
      const e = customEndDate.split('-');
      return `${s[2]}/${s[1]} - ${e[2]}/${e[1]}`;
    }
    return periods.find(p => p.id === period)?.label;
  };

  const modes = [
    { id: 'subtype', label: 'Tipo de Custo' },
    { id: 'urgency', label: 'Prioridade' },
    { id: 'category', label: 'Categorias' },
  ];

  return (
    <div className="screen bg-surface scrollbar-hide">
      <header className="page-header pt-12 pb-6 px-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">Análise</h1>
            <button onClick={toggleHideAnalysis} className="p-1.5 rounded-full bg-primary/10 text-primary active:scale-90 transition-all">
              {hideAnalysis ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-on-surface-variant font-body">Veja como seu dinheiro se moveu no período selecionado.</p>
        </div>
        <div className="relative flex-shrink-0 pb-1" ref={periodDropdownRef}>
          <button
            onClick={() => setShowDateModal(true)}
            className="flex items-center gap-2 bg-surface-container px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-on-surface-variant border border-surface-container-high active:scale-95 transition-all shadow-sm"
          >
            <Calendar size={14} className="text-primary" />
            {getCustomLabel()}
            <ChevronDown size={12} />
          </button>
        </div>
      </header>

      <div className="page-content px-6 space-y-8 pb-32">
        


        {/* Summary Cards Grid (Updated to 1x2) */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-tertiary-container rounded-2xl p-5 flex flex-col justify-between h-32">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-on-tertiary-fixed font-label font-bold uppercase tracking-widest text-[10px]">Entradas</span>
                <div className="w-7 h-7 rounded-full bg-tertiary-fixed-dim flex items-center justify-center">
                  <TrendingUp size={14} className="text-on-tertiary-fixed" />
                </div>
              </div>
              <h2 className="text-lg font-headline font-bold text-on-tertiary-container truncate">
                {loading ? '...' : maskValue(fmt(summary?.total_income ?? 0), hideAnalysis)}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-on-tertiary-fixed text-[10px] font-bold">
              <CheckCircle size={12} />
              <span className="leading-tight">+12% vs mês ant.</span>
            </div>
          </div>
          <div className="bg-primary-container rounded-2xl p-5 flex flex-col justify-between h-32">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-on-primary-container font-label font-bold uppercase tracking-widest text-[10px]">Saídas</span>
                <div className="w-7 h-7 rounded-full bg-primary-fixed-dim flex items-center justify-center">
                  <TrendingDown size={14} className="text-on-primary-container" />
                </div>
              </div>
              <h2 className="text-lg font-headline font-bold text-on-primary-container truncate">
                {loading ? '...' : maskValue(fmt(summary?.total_expense ?? 0), hideAnalysis)}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-on-primary-container text-[10px] font-bold">
              <AlertCircle size={12} />
              <span className="leading-tight">+5% vs esperado</span>
            </div>
          </div>
        </section>

        {/* Composition & Categories Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-0">
          {/* Composition Chart */}
          <div className="lg:col-span-1 flex flex-col items-center bg-white p-6 md:p-8 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between w-full gap-2 mb-4">
              <div className="flex flex-col w-full">
                <h3 className="font-headline font-bold text-xl mb-4 text-left">Gastos por categoria</h3>
                <div className="flex items-center justify-between w-full">
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant/30 px-2.5 py-1 rounded-lg text-[10px] font-bold text-on-surface-variant"
                    >
                      <span>{modes.find(m => m.id === viewMode)?.label || 'Por Categoria'}</span>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-surface-container overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                        {modes.map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => { setViewMode(mode.id as ViewMode); setIsDropdownOpen(false); }}
                            className={`w-full text-left px-5 py-3 text-xs font-bold transition-colors ${viewMode === mode.id ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex bg-surface-container-highest/30 p-1 rounded-full border border-outline-variant/20">
                    <button 
                      onClick={() => setLegendMode('value')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${legendMode === 'value' ? 'bg-primary text-white scale-105 shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                    >
                      Valor
                    </button>
                    <button 
                      onClick={() => setLegendMode('percentage')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${legendMode === 'percentage' ? 'bg-primary text-white scale-105 shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative w-[220px] h-[220px] mx-auto">
              <svg width="220" height="220" viewBox="0 0 100 100" className="-rotate-90">
                {composition.reduce((acc, item, i) => {
                  const circumference = 2 * Math.PI * 40;
                  const GAP = 15; // Fixed gap size
                  const availableCircumference = Math.max(0, circumference - (composition.length * GAP));
                  
                  const dash = (item.percentage / 100) * availableCircumference;
                  const offset = acc.offset;
                  
                  // Ensure dash is at least 0.1 so round caps show even for 0% or very small values
                  const visibleDash = Math.max(0.1, dash);

                  acc.elements.push(
                    <motion.circle
                      key={item.label}
                      initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: -offset, opacity: 0 }}
                      animate={{ strokeDasharray: `${visibleDash} ${circumference}`, strokeDashoffset: -offset, opacity: 1 }}
                      transition={{ 
                        duration: 0.5, 
                        type: "tween", 
                        ease: "linear", 
                        delay: i * 0.5,
                        opacity: { duration: 0.01, delay: i * 0.5 }
                      }}
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                  );
                  acc.offset += visibleDash + GAP;
                  return acc;
                }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-headline font-extrabold text-on-surface">
                  {loading ? '...' : fmt(summary?.total_expense ?? 0).split(',')[0]}
                </span>
              </div>
            </div>

            {/* Two-Column Legend */}
            <div className="mt-10 w-full grid grid-cols-2 gap-y-5 gap-x-12">
              {composition.length > 0 ? (
                composition.map((item, i) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs font-bold text-on-surface-variant truncate max-w-[60px]" title={item.label}>{item.label}</span>
                    </div>
                    <span className="text-xs font-bold">
                      {legendMode === 'value' ? fmt(item.value) : `${Math.round(item.percentage)}%`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-center text-xs font-bold text-on-surface-variant opacity-40 py-4">Sem dados</p>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-headline font-bold text-xl">Maiores Categorias</h3>
              <button className="text-primary font-bold text-sm">Ver todas</button>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-xl" />)
              ) : summary?.by_category?.length > 0 ? (
                [...summary.by_category].sort((a, b) => b.count - a.count).slice(0, 3).map((cat: any) => {
                  const color = CATEGORY_COLORS[cat.category] || '#9E9E9E';
                  const emoji = catEmoji(cat.category);
                  return (
                    <div key={cat.category} className="bg-white p-6 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: color + '22' }}>
                          {emoji}
                        </div>
                        <div>
                          <h4 className="font-bold">{cat.category}</h4>
                          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{cat.count} transações</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-headline font-bold">{fmt(cat.total)}</p>
                        <div className="flex items-center justify-end gap-1 text-xs font-bold" style={{ color }}>
                          <span>{Math.round(cat.percentage)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="card-low text-center p-8 bg-surface-container-lowest rounded-xl shadow-sm">
                  <p className="text-on-surface-variant font-medium text-xs">Nenhum gasto registrado.</p>
                </div>
              )}
            </div>
          </div>
        </section>



        {/* Shopping List */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-extrabold text-lg tracking-tight text-on-surface">
              Lista de Compras
            </h3>
            <button
              onClick={toggleList}
              className="text-primary text-xs font-black uppercase tracking-wider hover:opacity-70 transition-opacity flex items-center gap-1"
            >
              {listOpen ? (
                <>Recolher <ChevronUp size={14} /></>
              ) : (
                <>Expandir <ChevronDown size={14} /></>
              )}
            </button>
          </div>

          {listOpen && (
            <div className="bg-white rounded-[2rem] border border-surface-container/30 shadow-sm overflow-hidden">
              
              {/* Input para adicionar item */}
              <div className="flex items-center gap-3 p-4 border-b border-surface-container/20">
                <input
                  type="text"
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  placeholder="Adicionar item..."
                  className="flex-1 bg-surface-container-low rounded-xl px-4 py-2.5 font-medium text-on-surface border-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40"
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={addItem}
                  disabled={!newItem.trim()}
                  className="w-9 h-9 bg-primary text-on-primary rounded-full flex items-center justify-center active:scale-95 transition-all disabled:opacity-30"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Lista de itens */}
              {listItems.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-on-surface-variant text-sm font-medium opacity-50">
                    Nenhum item na lista ainda.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-surface-container/20">
                  {listItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-surface-container-low/50 transition-colors"
                      onClick={() => toggleItem(item.id)}
                    >
                      <button
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          item.checked
                            ? 'bg-primary border-primary'
                            : 'border-outline-variant'
                        }`}
                      >
                        {item.checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <span className={`flex-1 text-sm font-medium transition-all ${
                        item.checked ? 'line-through text-on-surface-variant opacity-50' : 'text-on-surface'
                      }`}>
                        {item.text}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(item.id);
                          setConfirmDeleteText(item.text);
                        }}
                        className="w-6 h-6 rounded-full text-on-surface-variant hover:text-error transition-all active:scale-95 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão de salvar (remover marcados) */}
              {listItems.length > 0 && (
                <div className="p-4 border-t border-surface-container/20">
                  <button
                    onClick={removeChecked}
                    disabled={!hasChecked}
                    className="w-full py-3 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed bg-primary text-on-primary shadow-sm shadow-primary/20"
                  >
                    {hasChecked ? 'Comprei! ✓' : 'Marque os itens comprados'}
                  </button>
                </div>
              )}

              {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-6"
                  onClick={() => setConfirmDeleteId(null)}>
                  <div className="bg-white rounded-[2rem] w-full max-w-xs p-6 shadow-2xl"
                    onClick={e => e.stopPropagation()}>
                    <p className="font-headline font-black text-on-surface text-lg mb-1">Remover item?</p>
                    <p className="text-sm text-on-surface-variant mb-6">
                      "<span className="font-bold text-on-surface">{confirmDeleteText}</span>" será removido da lista.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-3 rounded-full bg-surface-container-low text-on-surface-variant font-bold text-sm active:scale-95 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          if (confirmDeleteId) deleteItem(confirmDeleteId);
                          setConfirmDeleteId(null);
                        }}
                        className="flex-1 py-3 rounded-full bg-error text-white font-bold text-sm active:scale-95 transition-all"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </section>

      </div>



      {/* DateRangeModal */}
      {showDateModal && (
        <DateRangeModal
          currentPeriod={period}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onSelectPeriod={(id) => {
            setPeriod(id);
            setCustomStartDate(null);
            setCustomEndDate(null);
            setShowDateModal(false);
          }}
          onSelectCustomRange={(startDate, endDate) => {
            setCustomStartDate(startDate);
            setCustomEndDate(endDate);
            setPeriod('custom');
            setShowDateModal(false);
          }}
          onClose={() => setShowDateModal(false)}
        />
      )}
    </div>
  );
};

export default Analysis;
