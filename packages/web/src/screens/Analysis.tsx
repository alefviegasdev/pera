import React, { useState, useEffect, useRef } from 'react';
import { catColor, catEmoji } from '../utils/categories';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown,
  ArrowUpRight,
} from 'lucide-react';

type ViewMode = 'subtype' | 'urgency' | 'category';

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
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('subtype');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, [userId, period]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, txsRes] = await Promise.all([
        fetch(`/api/transactions/summary?user_id=${userId}&period=${period}`),
        fetch(`/api/transactions?user_id=${userId}&period=${period}`)
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
        const label = t.subtype === 'fixed' ? 'Fixos' : t.subtype === 'semifixed' ? 'Semi-fixos' : 'Variáveis';
        const color = t.subtype === 'fixed' ? '#4A7FE5' : t.subtype === 'semifixed' ? '#A5A5A5' : '#7CB342';
        if (!groups[label]) groups[label] = { value: 0, color, label };
        groups[label].value += t.value;
      });
    } else if (viewMode === 'urgency') {
      txs.forEach(t => {
        const label = t.urgency === 'urgent' ? 'Urgentes' : 'Não urgentes';
        const color = t.urgency === 'urgent' ? '#FF5252' : '#8BC34A';
        if (!groups[label]) groups[label] = { value: 0, color, label };
        groups[label].value += t.value;
      });
    } else {
      txs.forEach(t => {
        const label = t.category;
        const color = catColor(t.category);
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

  const getConicGradient = () => {
    let current = 0;
    const parts = composition.map(c => {
      const start = current;
      current += c.percentage;
      return `${c.color} ${start}% ${current}%`;
    });
    if (parts.length === 0) return 'var(--surface-container-highest)';
    return `conic-gradient(${parts.join(', ')})`;
  };

  const periods = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Este mês' },
    { id: '30days', label: '30 dias' },
  ];

  const modes = [
    { id: 'subtype', label: 'Tipo de Custo' },
    { id: 'urgency', label: 'Urgência' },
    { id: 'category', label: 'Categorias' },
  ];

  return (
    <div className="screen bg-surface">
      <header className="page-header pt-12 pb-6 px-6">
        <h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Análise</h1>
        <p className="text-on-surface-variant font-body">Veja como seu dinheiro se moveu no período selecionado.</p>
      </header>

      <div className="page-content px-6 space-y-8 pb-32">
        
        {/* Period Selector Chips */}
        <section className="overflow-x-auto scrollbar-hide -mx-6 px-6">
          <div className="flex gap-2 min-w-max">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-6 py-2 rounded-full font-label font-bold text-sm transition-all active:scale-95 ${
                  period === p.id 
                    ? 'bg-primary text-on-primary' 
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-4">
          <div className="bg-tertiary-container rounded-[2rem] p-8 flex flex-col justify-between aspect-[16/9] shadow-sm">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-on-tertiary-fixed font-label font-bold uppercase tracking-widest text-[10px]">Total Entradas</span>
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed-dim flex items-center justify-center">
                  <TrendingUp size={20} className="text-on-tertiary-fixed" />
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-3xl font-headline font-bold text-on-tertiary-container">
                  {loading ? '...' : fmt(summary?.total_income ?? 0)}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-on-tertiary-fixed text-xs font-bold">
              <CheckCircle size={14} />
              <span>Dados sincronizados</span>
            </div>
          </div>

          <div className="bg-primary-container rounded-[2rem] p-8 flex flex-col justify-between aspect-[16/9] shadow-sm">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-on-primary-container font-label font-bold uppercase tracking-widest text-[10px]">Total Saídas</span>
                <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center">
                  <TrendingDown size={20} className="text-on-primary-container" />
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-3xl font-headline font-bold text-on-primary-container">
                  {loading ? '...' : fmt(summary?.total_expense ?? 0)}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-on-primary-container text-xs font-bold">
              <AlertCircle size={14} />
              <span>Variação monitorada</span>
            </div>
          </div>
        </section>

        {/* Composition Section */}
        <section className="bg-surface-container-low rounded-[2rem] p-8 space-y-8">
          <div className="flex justify-between items-center relative z-20">
            <h3 className="font-headline font-bold text-xl text-on-surface">Composição</h3>
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-on-surface-variant shadow-sm border border-surface-container active:scale-95 transition-transform"
              >
                {modes.find(m => m.id === viewMode)?.label} <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-surface-container overflow-hidden animate-in fade-in slide-in-from-top-2">
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
          </div>

          <div className="relative flex justify-center py-6">
            <div className="w-52 h-52 rounded-full flex items-center justify-center relative shadow-sm">
              <div 
                className="absolute inset-0 rounded-full border-[14px] border-surface-container-highest opacity-10"
              />
              <div 
                className="absolute inset-0 rounded-full border-[14px] transition-all duration-1000 shadow-sm"
                style={{ 
                  background: getConicGradient(),
                  WebkitMaskImage: 'radial-gradient(transparent 62%, black 63%)',
                  maskImage: 'radial-gradient(transparent 62%, black 63%)',
                }}
              />
              <div className="text-center z-10">
                <span className="block text-2xl font-headline font-black text-on-surface">
                  {loading ? '...' : fmt(summary?.total_expense ?? 0).split(',')[0]}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Impacto Total</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {composition.length > 0 ? (
              composition.map((item, i) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-black text-on-surface-variant truncate max-w-[140px] uppercase tracking-wider">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold text-on-surface-variant opacity-50">{fmt(item.value)}</span>
                    <span className="font-headline font-black text-sm text-on-surface min-w-[40px] text-right">{Math.round(item.percentage)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs font-bold text-on-surface-variant opacity-40 py-4">Sem dados para o período</p>
            )}
          </div>
        </section>

        {/* Maiores Categorias Breakdown */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-headline font-bold text-xl text-on-surface">Maiores Categorias</h3>
            <button className="text-primary font-black text-[10px] uppercase tracking-widest px-3 py-1.5 bg-primary/5 rounded-full">Ver todas</button>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-[2rem]" />)
            ) : summary?.by_category?.length > 0 ? (
              summary.by_category.slice(0, 5).map((cat: any) => {
                const color = catColor(cat.category);
                const emoji = catEmoji(cat.category);
                return (
                  <div key={cat.category} className="bg-white p-6 rounded-[2rem] flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer shadow-sm border border-surface-container/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm" style={{ backgroundColor: color + '22' }}>
                        {emoji}
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">{cat.category}</h4>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{cat.count} transações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-headline font-bold text-on-surface">{fmt(cat.total)}</p>
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
                <p className="text-on-surface-variant font-medium">Nenhum gasto registrado.</p>
              </div>
            )}
          </div>
        </section>

        {/* Insight Banner */}
        <section className="bg-secondary-container rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden shadow-sm">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary-fixed-dim rounded-full blur-3xl opacity-30"></div>
          <div className="space-y-3 z-10">
            <h4 className="text-xl font-headline font-black text-on-secondary-container">Insight da Pera 🍐</h4>
            <p className="text-on-secondary-container opacity-90 leading-relaxed text-sm font-medium">
              Sua análise mostra que o foco em **{viewMode === 'subtype' ? 'Custo Fixo' : viewMode === 'urgency' ? 'Urgência' : 'Categorias'}** pode revelar oportunidades de economia inteligente.
            </p>
          </div>
          <button className="bg-on-secondary-container text-white px-8 py-3 rounded-full font-bold text-sm active:scale-95 transition-all w-fit shadow-lg shadow-black/10">
            Ver Metas
          </button>
        </section>

      </div>
    </div>
  );
};

export default Analysis;
