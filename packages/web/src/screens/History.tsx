import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, X, Eye, EyeOff, ArrowUpRight, Pencil } from 'lucide-react';
import { catColor, catEmoji } from '../utils/categories';
import TransactionModal from '../components/TransactionModal';
import InstallmentsModal from '../components/InstallmentsModal';
import DateRangeModal from '../components/DateRangeModal';
import CategoryDetailsModal from '../components/CategoryDetailsModal';
import EditInstallmentModal from '../components/EditInstallmentModal';

const History = ({ 
  userId, 
  onModalOpen, 
  onModalClose 
}: { 
  userId: string; 
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) => {
  const [txs, setTxs] = useState<any[]>([]);
  const [insts, setInsts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showInstallments, setShowInstallments] = useState(false);
  const [period, setPeriod] = useState(() => sessionStorage.getItem('pera_shared_period') || '7days');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = React.useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [editingInst, setEditingInst] = useState<any>(null);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  
  // Persistência via localStorage
  const [hideHistory, setHideHistory] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string | null>(() => sessionStorage.getItem('pera_shared_start_date'));
  const [customEndDate, setCustomEndDate] = useState<string | null>(() => sessionStorage.getItem('pera_shared_end_date'));

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
    setHideHistory(master);
  }, []);

  const toggleHideHistory = () => {
    setHideHistory(prev => !prev);
  };

  const maskValue = (value: string, hide: boolean) => hide ? '•••••' : value;

  useEffect(() => {
    if (selectedTx || showInstallments || showDateModal || editingInst) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [selectedTx, showInstallments, showDateModal, editingInst, onModalOpen, onModalClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchAll(); }, [userId, period, customStartDate, customEndDate]);
  
  const periodRef = React.useRef(period);
  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAll(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [userId, period, customStartDate, customEndDate]);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const txUrl = period === 'custom' && customStartDate && customEndDate
        ? `/api/transactions?user_id=${userId}&start_date=${customStartDate}&end_date=${customEndDate}`
        : `/api/transactions?user_id=${userId}&period=${period}`;
      const [txRes, summaryRes, instRes, ccRes] = await Promise.all([
        fetch(txUrl),
        fetch(period === 'custom' && customStartDate && customEndDate
          ? `/api/transactions/summary?user_id=${userId}&start_date=${customStartDate}&end_date=${customEndDate}`
          : `/api/transactions/summary?user_id=${userId}&period=${period}`
        ),
        fetch(`/api/installments?user_id=${userId}`),
        fetch(`/api/credit-cards?user_id=${userId}`)
      ]);
      const txData = await txRes.json();
      const summaryData = await summaryRes.json();
      const instData = await instRes.json();
      
      setTxs(txData.transactions || []);
      setTotal(txData.total_expense || 0);
      setSummary(summaryData);
      setInsts(Array.isArray(instData) ? instData : []);
      try { const ccData = await ccRes.json(); setCreditCards(Array.isArray(ccData) ? ccData : []); } catch { setCreditCards([]); }
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

  return (
    <div className="screen bg-surface">
      <header className="page-header pt-12 pb-4 px-6 sticky top-0 bg-surface/80 backdrop-blur-lg z-50 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-headline tracking-tighter text-on-surface text-4xl font-extrabold leading-none">Histórico</h1>
          <button onClick={toggleHideHistory} className="p-1.5 rounded-full bg-primary/10 text-primary active:scale-90 transition-all">
            {hideHistory ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
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

      <main className="page-content px-6 space-y-8 mt-4">


        {/* Transaction Summary Card */}
        <section className="card-white rounded-[2rem] p-8 flex flex-col gap-1 shadow-sm">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Volume Total</span>
          <div className="flex flex-col">
            <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tighter">
              {loading ? '...' : maskValue(fmt(total), hideHistory)}
            </h2>
            <p className="text-primary font-bold text-xs mt-1.5">{txs.length} transações no período</p>
          </div>
        </section>

        {/* Active Installments Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-extrabold text-lg tracking-tight text-on-surface">Parcelamentos Ativos</h3>
            <button 
              onClick={() => setShowInstallments(true)}
              className="text-primary text-xs font-black uppercase tracking-wider hover:opacity-70 transition-opacity"
            >
              Ver todos
            </button>
          </div>
          
          {insts.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-2 max-w-full">
              {insts.slice(0, 3).map(inst => (
                <div key={inst.id} className="min-w-[280px] bg-primary text-on-primary rounded-[2rem] p-7 relative overflow-hidden group shadow-md shadow-primary/10">
                  {/* Abstract Pattern */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <circle cx="90" cy="10" fill="white" r="40" />
                      <circle cx="10" cy="90" fill="white" r="30" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingInst(inst); }}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-on-primary/20 active:scale-90 transition-all"
                  >
                    <Pencil size={14} className="text-on-primary" />
                  </button>
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
          ) : (
            <div className="bg-surface-container-low p-6 rounded-[2rem] border border-dashed border-outline-variant text-center">
              <p className="text-xs font-medium text-on-surface-variant opacity-60">Nenhum parcelamento ativo no momento.</p>
            </div>
          )}
        </section>

        {/* Maiores Categorias Breakdown */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-extrabold text-lg tracking-tight text-on-surface">Mais gastos</h3>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-[2rem]" />)
            ) : summary?.by_category?.length > 0 ? (
              [...summary.by_category].sort((a, b) => b.count - a.count).map((cat: any) => {
                const color = catColor(cat.category);
                const emoji = catEmoji(cat.category);
                return (
                  <div key={cat.category} onClick={() => setSelectedCategory(cat.category)} className="bg-white p-6 rounded-[2rem] flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer shadow-sm border border-surface-container/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm" style={{ backgroundColor: color + '22' }}>
                        {emoji}
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface text-sm">{cat.category}</h4>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{cat.count} PAGOS</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-headline font-bold text-on-surface text-sm">{fmt(cat.total)}</p>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-primary">
                        <ArrowUpRight size={12} />
                        <span>{Math.round(cat.percentage)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card-low text-center p-8 bg-surface-container-low rounded-[2rem]">
                <p className="text-on-surface-variant font-medium text-xs">Nenhum gasto registrado.</p>
              </div>
            )}
          </div>
        </section>

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

      {selectedCategory && (
        <CategoryDetailsModal
          category={selectedCategory}
          period={period}
          userId={userId}
          initialPeriod={period}
          onPeriodChange={(p) => setPeriod(p)}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      {showInstallments && (
        <InstallmentsModal userId={userId} onClose={() => setShowInstallments(false)} />
      )}

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

      {editingInst && (
        <EditInstallmentModal
          inst={editingInst}
          creditCards={creditCards}
          userId={userId}
          onClose={() => setEditingInst(null)}
          onSuccess={() => { setEditingInst(null); fetchAll(true); }}
        />
      )}
    </div>
  );
};

export default History;
