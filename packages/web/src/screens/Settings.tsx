import React, { useState, useEffect } from 'react';
import { Target, PieChart, Calendar, ChevronRight, User, Heart } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <h2 className="sec-label mb-3 px-2">{title}</h2>
    <div className="flex flex-col gap-3">
      {children}
    </div>
  </div>
);

const Settings = ({ userId, onUserChange }: { userId: string; onUserChange: (u: string) => void }) => {
  const [fixed,   setFixed]   = useState<any[]>([]);
  const [goals,   setGoals]   = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, gRes, bRes] = await Promise.all([
        fetch(`/api/fixed-expenses?user_id=${userId}`),
        fetch(`/api/goals?user_id=${userId}`),
        fetch(`/api/budgets?user_id=${userId}`)
      ]);
      const [fData, gData, bData] = await Promise.all([fRes.json(), gRes.json(), bRes.json()]);
      setFixed(Array.isArray(fData) ? fData : []);
      setGoals(Array.isArray(gData) ? gData : []);
      setBudgets(Array.isArray(bData) ? bData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  return (
    <div className="screen">
      <header className="page-header pb-4 border-b border-[rgba(173,173,169,0.2)] mb-4">
        <h1 className="font-display text-3xl mb-1">Ajustes</h1>
      </header>

      <div className="page-content">

        {/* Profile */}
        <div className="card text-center mb-4 flex flex-col items-center pb-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-container)] flex items-center justify-center mb-4 text-2xl text-[var(--outline-variant)]">
             <User />
          </div>
          <input
            value={userId === '5637235532' ? 'Gabriel Santos' : userId}
            onChange={e => onUserChange(e.target.value)}
            className="text-center font-display text-xl bg-transparent outline-none border-b border-[var(--outline-variant)] pb-1 mb-1 focus:border-[var(--primary)] transition-colors w-full max-w-[200px]"
            placeholder="Nome de Usuário"
          />
          <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-widest mt-2 bg-[rgba(93,63,211,0.1)] py-1 px-3 rounded-full">
            Plano Premium Platinum
          </p>
        </div>

        {/* Dízimo */}
        <Section title="Configuração de Dízimo">
          <div className="card-tertiary p-4 relative overflow-hidden">
             <div className="flex justify-between items-center mb-2">
                 <div>
                    <p className="text-label mb-1">Valor Calculado</p>
                    <p className="font-display text-xl text-[var(--on-tertiary-container)]">{fmt(1245.00)}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-label mb-1">Percentual</p>
                    <p className="font-bold text-lg text-[var(--on-tertiary-container)]">10%</p>
                 </div>
             </div>
             <p className="text-xs font-medium text-[var(--tertiary)] mt-3 pt-3 border-t border-[rgba(76,99,19,0.15)]">
               Baseado na sua renda mensal declarada de R$ 12.450,00. O valor é provisionado automaticamente ao receber depósitos.
             </p>
             <Heart className="absolute -bottom-4 -right-2 opacity-5 text-[#8db33e]" size={80} />
          </div>
        </Section>

        {/* Contas Fixas */}
        <Section title="Contas Fixas">
          {fixed.length === 0 ? (
            <p className="text-sm font-semibold text-muted text-center py-2">Nenhuma conta configurada</p>
          ) : (
            fixed.map(f => (
              <div key={f.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-container)] flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} color="var(--on-surface-variant)" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate mb-0.5">{f.name}</p>
                  <p className="text-xs font-semibold text-muted">Vence dia {f.due_day}</p>
                </div>
                <p className="font-bold text-sm text-[var(--on-surface)]">{fmt(f.value)}</p>
                <ChevronRight size={16} color="var(--outline-variant)" className="ml-1" />
              </div>
            ))
          )}
        </Section>

        {/* Goals */}
        <Section title="Metas de Economia">
          {goals.length === 0 ? (
             <p className="text-sm font-semibold text-muted text-center py-2">Nenhuma meta configurada</p>
          ) : (
            goals.map(g => {
              const pct = Math.min(g.percentage_progress, 100);
              return (
                <div key={g.id} className="card-secondary p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.4)] flex items-center justify-center flex-shrink-0 text-[#785500]">
                       <Target size={18} />
                    </div>
                    <div className="flex-1">
                       <p className="font-bold text-sm leading-tight text-[var(--on-secondary-container)]">{g.name}</p>
                       <p className="text-[10px] font-bold text-[#785500] uppercase tracking-wide opacity-80">Meta: {fmt(g.target_value)}</p>
                    </div>
                    <div className="text-right">
                       <span className="font-display text-lg text-[var(--on-secondary-container)]">{Math.round(pct)}%</span>
                       <p className="text-[9px] font-bold text-[#785500] uppercase tracking-wide">Concluído</p>
                    </div>
                  </div>
                  <div className="progress-track-sm bg-[rgba(255,255,255,0.5)]">
                    <div className="progress-bar-yellow" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </Section>

        {/* Budgets */}
        <Section title="Orçamentos Mensais">
           {budgets.length === 0 ? (
             <p className="text-sm font-semibold text-muted text-center py-2">Nenhum orçamento configurado</p>
           ) : (
             budgets.map(b => {
               const rawPct = (b.spent / b.monthly_limit) * 100;
               const pct = Math.min(rawPct, 100);
               const over = rawPct > 100;

               return (
                 <div key={b.id} className="card-low p-4 relative overflow-hidden">
                   <div className="flex justify-between items-end mb-3">
                     <div>
                       <p className="font-bold text-[15px] mb-1">{b.category}</p>
                       <p className="text-[11px] font-bold text-muted uppercase tracking-wide">
                          <span className={over ? 'text-red-500' : 'text-[var(--on-surface)]'}>{fmt(b.spent)}</span> / {fmt(b.monthly_limit)}
                       </p>
                     </div>
                     <span className={`font-bold text-sm ${over ? 'text-[var(--error)]' : 'text-muted'}`}>
                       {Math.round(rawPct)}%
                     </span>
                   </div>
                   <div className="progress-track-sm">
                     <div className={over ? 'progress-bar-error' : 'progress-bar'} style={{ width: `${pct}%` }} />
                   </div>
                 </div>
               );
             })
           )}
        </Section>

      </div>
    </div>
  );
};

export default Settings;
