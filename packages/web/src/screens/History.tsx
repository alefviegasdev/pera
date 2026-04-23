import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Plus, ChevronUp, X, Eye, EyeOff } from 'lucide-react';
import { catColor, catEmoji } from '../utils/categories';
import TransactionModal from '../components/TransactionModal';
import InstallmentsModal from '../components/InstallmentsModal';

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
  const [period, setPeriod] = useState('today');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = React.useRef<HTMLDivElement>(null);
  
  // Persistência via localStorage
  const [listOpen, setListOpen] = useState<boolean>(() => {
    return localStorage.getItem(`shopping_list_open_${userId}`) !== 'false';
  });
  const [listItems, setListItems] = useState<{id: string; text: string; checked: boolean}[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState<string>('');
  const [hideHistory, setHideHistory] = useState(false);

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
    if (selectedTx || showInstallments) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [selectedTx, showInstallments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchAll(); fetchShoppingList(); }, [userId, period]);
  
  const periodRef = React.useRef(period);
  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAll(true);
      fetchShoppingList();
    }, 15000);
    return () => clearInterval(interval);
  }, [userId, period]);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
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

  const periods = [
    { id: 'today', label: 'Hoje' },
    { id: 'yesterday', label: 'Ontem' },
    { id: 'week', label: 'Esta semana' },
    { id: '7days', label: '7 dias' },
    { id: 'month', label: 'Este mês' },
    { id: '90days', label: '90 dias' },
    { id: 'all', label: 'Tudo' },
  ];

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
            onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
            className="flex items-center gap-2 bg-surface-container px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-on-surface-variant border border-surface-container-high active:scale-95 transition-all shadow-sm"
          >
            <Calendar size={14} className="text-primary" />
            {periods.find(p => p.id === period)?.label}
            <ChevronDown size={12} className={`transition-transform ${periodDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {periodDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-surface-container overflow-hidden z-50 w-40">
              {periods.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPeriod(p.id); setPeriodDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors flex items-center gap-2 ${
                    period === p.id ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {period === p.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  {p.label}
                </button>
              ))}
            </div>
          )}
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

      {showInstallments && (
        <InstallmentsModal userId={userId} onClose={() => setShowInstallments(false)} />
      )}
    </div>
  );
};

export default History;
