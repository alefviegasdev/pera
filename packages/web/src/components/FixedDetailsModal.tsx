import React, { useState, useEffect } from 'react';
import { X, Zap, Wifi, Home, Dumbbell, CheckCircle2, CreditCard, Heart } from 'lucide-react';

interface FixedDetailsModalProps {
  unpaidBills: any[];
  installments: any[];
  tithingValue: number;
  totalValue?: number;
  onClose: () => void;
}

const fmt = (n: number) =>
  n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

const FixedDetailsModal: React.FC<FixedDetailsModalProps> = ({ 
  unpaidBills, 
  installments, 
  tithingValue, 
  totalValue,
  onClose 
}) => {
  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('luz') || n.includes('energia')) return <Zap size={20} />;
    if (n.includes('internet') || n.includes('wifi')) return <Wifi size={20} />;
    if (n.includes('aluguel') || n.includes('condomínio')) return <Home size={20} />;
    if (n.includes('academia') || n.includes('gym')) return <Dumbbell size={20} />;
    return <Zap size={20} />;
  };

  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => setDragStart(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart === null) return;
    const offset = e.touches[0].clientY - dragStart;
    if (offset > 0) setDragOffset(offset);
  };
  const handleTouchEnd = () => {
    if (dragOffset > window.innerHeight * 0.85 * 0.3) onClose();
    setDragStart(null);
    setDragOffset(0);
  };

  const totalRemaining = 
    unpaidBills.reduce((sum, b) => sum + Number(b.value), 0) + 
    installments.reduce((sum, i) => sum + Number(i.installment_value), 0) + 
    tithingValue;

  return (
    <div className="fixed inset-0 bg-on-surface/50 flex flex-col justify-end" onClick={onClose} style={{ zIndex: 9999, overflowX: 'hidden' }}>
      <div 
        className="bg-surface rounded-t-[3rem] w-full max-w-2xl mx-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
        style={{
          height: '85dvh',
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? 'none' : 'transform 0.3s ease',
          overflowX: 'hidden'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="pt-4 pb-6 px-8">
          <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-8" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">O que falta pagar</h2>
              <p className="text-on-surface-variant text-sm font-medium opacity-60">Custos fixos previstos para o mês</p>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest active:scale-95 transition-all shadow-sm"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary-container/30 p-5 rounded-[2rem] border border-secondary-container/20">
              <span className="text-on-secondary-container font-black text-[10px] uppercase tracking-widest opacity-70 block mb-2">Total do Mês</span>
              <span className="text-on-secondary-container font-headline font-black text-xl tracking-tight">
                {fmt(totalValue || totalRemaining)}
              </span>
            </div>
            <div className="bg-error-container/20 p-5 rounded-[2rem] border border-error-container/30">
              <span className="text-error font-black text-[10px] uppercase tracking-widest opacity-70 block mb-2">Falta Pagar</span>
              <span className="text-error font-headline font-black text-xl tracking-tight">
                {fmt(totalRemaining)}
              </span>
            </div>
          </div>
        </div>

        <div className="px-8 pb-12 overflow-y-auto space-y-4 scrollbar-hide" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y', overflowX: 'hidden' }}>
          {/* Tithing */}
          {tithingValue > 0 && (
            <div className="bg-white p-6 rounded-[2rem] border border-surface-container/50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-tertiary-container/20 rounded-2xl flex items-center justify-center text-tertiary">
                   <Heart size={20} fill="currentColor" className="opacity-80" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface">Dízimo (Projetado)</h3>
                  <span className="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Dízimo</span>
                </div>
              </div>
              <p className="font-headline font-black text-lg text-on-surface">{fmt(tithingValue)}</p>
            </div>
          )}

          {/* Monthly Bills */}
          {unpaidBills.map(bill => (
            <div key={bill.id} className="bg-white p-6 rounded-[2rem] border border-surface-container/50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-container/20 rounded-2xl flex items-center justify-center text-primary">
                   {getIcon(bill.name)}
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface">{bill.name}</h3>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Vencimento</span>
                </div>
              </div>
              <p className="font-headline font-black text-lg text-on-surface">{fmt(bill.value)}</p>
            </div>
          ))}

          {/* Installments */}
          {installments.map(inst => (
            <div key={inst.id} className="bg-white p-6 rounded-[2rem] border border-surface-container/50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary-container/20 rounded-2xl flex items-center justify-center text-secondary">
                   <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface truncate max-w-[150px]">{inst.description}</h3>
                  <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Parcela</span>
                </div>
              </div>
              <p className="font-headline font-black text-lg text-on-surface">{fmt(inst.installment_value)}</p>
            </div>
          ))}

          {unpaidBills.length === 0 && installments.length === 0 && tithingValue === 0 && (
            <div className="py-20 text-center">
               <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-on-surface/20" />
               </div>
               <p className="text-on-surface-variant font-bold opacity-40">Tudo em dia por aqui!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixedDetailsModal;
