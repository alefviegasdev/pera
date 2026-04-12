import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle, Smartphone, Laptop, Plane, GraduationCap, ChevronRight, Verified } from 'lucide-react';
import { catColor, catEmoji } from '../utils/categories';

interface InstallmentsModalProps {
  userId: string;
  onClose: () => void;
}

const fmt = (n: number) =>
  n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

const InstallmentsModal: React.FC<InstallmentsModalProps> = ({ userId, onClose }) => {
  const [insts, setInsts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstallments();
  }, [userId]);

  const fetchInstallments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/installments?user_id=${userId}`);
      const data = await res.json();
      setInsts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalMonthly = insts.reduce((acc, curr) => acc + (curr.installment_value || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card scrollbar-hide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-handle" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-headline text-2xl font-bold text-on-surface">Parcelamentos</h1>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4 py-8">
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        ) : insts.length === 0 ? (
          /* EMPTY STATE */
          <div className="flex flex-col items-center text-center py-12 px-6">
            <div className="relative mb-12">
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-tertiary-container/30 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-primary-container/20 rounded-full blur-3xl animate-pulse delay-700" />
              
              <div className="relative z-10 bg-white rounded-[2rem] p-12 shadow-float transform -rotate-2 border border-surface-container">
                <div className="w-24 h-24 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-4">
                  <Receipt size={48} strokeWidth={1} className="text-primary" />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-secondary-container p-3 rounded-xl transform rotate-6 shadow-sm">
                  <span className="text-2xl">😊</span>
                </div>
                <div className="absolute -top-6 -left-6 bg-tertiary-fixed p-2.5 rounded-full shadow-sm">
                  <CheckCircle size={20} className="text-on-tertiary-fixed" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-on-surface mb-3 tracking-tighter leading-tight">
              Nenhum parcelamento ativo
            </h2>
            <p className="text-sm text-on-surface-variant font-medium max-w-[280px] mb-8 leading-relaxed">
              Você não tem compras parceladas no momento. Suas finanças estão limpas!
            </p>

            <button className="text-primary font-bold text-sm hover:underline underline-offset-8 transition-all mb-12">
              Ver histórico encerrado
            </button>

            <div className="w-full bg-surface-container-low p-6 rounded-[2rem] border border-surface-container flex items-center gap-4">
              <div className="w-14 h-14 bg-tertiary-container rounded-full flex items-center justify-center flex-shrink-0">
                <Verified size={28} className="text-on-tertiary-container" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-on-surface text-base">Parabéns!</h4>
                <p className="text-xs text-on-surface-variant leading-tight">Sua capacidade de crédito está em 100% para novas oportunidades.</p>
              </div>
            </div>
          </div>
        ) : (
          /* DATA STATE */
          <div className="space-y-10 pb-8">
            <section>
              <p className="font-headline font-black text-primary tracking-[0.2em] mb-1.5 uppercase text-[10px]">Visão Geral</p>
              <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tighter">Parcelamentos Ativos</h2>
              
              <div className="mt-6 flex gap-3">
                <div className="bg-primary/5 border border-primary/10 px-5 py-5 rounded-[1.5rem] flex-1">
                  <p className="text-[9px] font-black text-primary-dim uppercase mb-1 tracking-widest text-opacity-70">Total Mensal</p>
                  <p className="font-headline text-xl font-black text-primary">{fmt(totalMonthly)}</p>
                </div>
                <div className="bg-tertiary-container/30 border border-tertiary-container/10 px-5 py-5 rounded-[1.5rem] flex-1">
                  <p className="text-[9px] font-black text-tertiary-dim uppercase mb-1 tracking-widest text-opacity-70">Planos</p>
                  <p className="font-headline text-xl font-black text-tertiary">{String(insts.length).padStart(2, '0')}</p>
                </div>
              </div>
            </section>

            <div className="space-y-4">
              {insts.map(inst => {
                const color = catColor(inst.category);
                const emoji = catEmoji(inst.category);
                const paid = inst.current_installment;
                const total = inst.total_installments;
                const progress = (paid / total) * 100;
                const remaining = (total - paid) * (inst.installment_value || 0);

                return (
                  <div 
                    key={inst.id} 
                    className="bg-white rounded-[2rem] p-6 shadow-sm border border-surface-container hover:shadow-md transition-shadow active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                          style={{ backgroundColor: color + '22' }}
                        >
                          {emoji}
                        </div>
                        <div>
                          <h3 className="font-headline text-lg font-extrabold tracking-tight text-on-surface">{inst.description}</h3>
                          <span className="inline-block px-3 py-1 bg-surface-container-low rounded-full text-[9px] font-black uppercase text-on-surface-variant tracking-[0.15em] mt-1.5 border border-surface-container">
                            {inst.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-headline font-black text-lg text-on-surface">{fmt(inst.installment_value)}</p>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-0.5">/mês</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                        <span>Progresso</span>
                        <span className="text-primary font-black">{paid} / {total}</span>
                      </div>
                      
                      <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ 
                            width: `${progress}%`,
                            background: `linear-gradient(to right, ${color}, var(--primary))`
                          }} 
                        />
                      </div>
                      
                      <div className="pt-2 flex justify-between items-center text-xs">
                        <p className="font-medium text-on-surface-variant flex items-center gap-1.5">
                          Faltam <span className="text-on-surface font-black">{fmt(remaining)}</span>
                        </p>
                        <ChevronRight size={16} className="text-outline-variant" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallmentsModal;
