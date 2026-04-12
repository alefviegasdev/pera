import React, { useState, useEffect } from 'react';
import { catColor, catEmoji } from '../utils/categories';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

const Analysis = ({ userId }: { userId: string }) => {
  const [summary, setSummary] = useState<any>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [userId, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/summary?user_id=${userId}&period=${period}`);
      setSummary(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  const periods = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mês' },
    { id: 'last_month', label: 'Mês passado' },
    { id: '30days', label: '30 dias' },
  ];

  return (
    <div className="screen bg-surface">
      <header className="page-header pt-12 pb-6 px-6">
        <h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Análise</h1>
        <p className="text-on-surface-variant font-body">Veja como seu dinheiro se moveu no período selecionado.</p>
      </header>

      <div className="page-content px-6 space-y-8">
        
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

        {/* Summary Cards: Bento Grid Style */}
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
              <span>12% maior que o mês anterior</span>
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
              <span>5% maior que o esperado</span>
            </div>
          </div>
        </section>

        {/* Expense Proportion & Categories */}
        <section className="grid grid-cols-1 gap-8">
          {/* Composition Section */}
          <div className="bg-surface-container-low rounded-[2rem] p-8 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-on-surface">Composição</h3>
              <div className="relative inline-block">
                <button className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-on-surface-variant shadow-sm">
                  Tipo de Custo <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="relative flex justify-center py-4">
              {/* Wealth Arc Representation */}
              <div className="w-48 h-48 rounded-full border-[12px] border-surface-container-highest flex items-center justify-center relative shadow-inner">
                <div 
                  className="absolute inset-[-12px] rounded-full border-[12px] border-t-primary border-r-primary border-l-primary-container border-b-transparent transform rotate-45"
                  style={{ maskImage: 'conic-gradient(#000 75%, transparent 75%)' }}
                />
                <div className="text-center">
                  <span className="block text-2xl font-headline font-black text-on-surface">
                    {loading ? '...' : fmt(summary?.total_expense ?? 0).split(',')[0]}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Despesa Total</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-sm font-bold text-on-surface">Fixos</span>
                </div>
                <span className="font-bold text-on-surface">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-container"></div>
                  <span className="text-sm font-bold text-on-surface">Variáveis</span>
                </div>
                <span className="font-bold text-on-surface">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-surface-container-highest"></div>
                  <span className="text-sm font-bold text-on-surface">Semi-fixos</span>
                </div>
                <span className="font-bold text-on-surface">20%</span>
              </div>
            </div>
          </div>

          {/* Maiores Categorias Breakdown */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-on-surface">Maiores Categorias</h3>
              <button className="text-primary font-bold text-sm">Ver todas</button>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-[2rem]" />)
              ) : summary?.by_category?.length > 0 ? (
                summary.by_category.slice(0, 5).map((cat: any) => {
                  const color = catColor(cat.category);
                  const emoji = catEmoji(cat.category);
                  return (
                    <div key={cat.category} className="bg-white p-6 rounded-[2rem] flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: color + '22' }}>
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
                          <span>+{Math.round(cat.percentage)}%</span>
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
          </div>
        </section>

        {/* Insight Banner */}
        <section className="bg-secondary-container rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden shadow-sm">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary-fixed-dim rounded-full blur-3xl opacity-30"></div>
          <div className="space-y-3 z-10">
            <h4 className="text-xl font-headline font-black text-on-secondary-container">Insight da Pera 🍐</h4>
            <p className="text-on-secondary-container opacity-90 leading-relaxed text-sm font-medium">
              Você gastou 15% menos em <strong>Alimentação</strong> esta semana comparado à média. Isso economizou R$ 320,00 para seu objetivo de <strong>Viagem</strong>.
            </p>
          </div>
          <button className="bg-on-secondary-container text-white px-8 py-3 rounded-full font-bold text-sm active:scale-95 transition-all w-fit">
            Ver Metas
          </button>
        </section>

      </div>
    </div>
  );
};

export default Analysis;
