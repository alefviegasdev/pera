import React from 'react';
import { X, Zap, Wifi, Home, Dumbbell, CheckCircle2 } from 'lucide-react';

interface BillsModalProps {
  bills: any[];
  onClose: () => void;
  onPay: (bill: any) => void;
}

const fmt = (n: number) =>
  n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

const BillsModal: React.FC<BillsModalProps> = ({ bills, onClose, onPay }) => {
  const today = new Date().getDate();

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('luz') || n.includes('energia')) return <Zap size={24} />;
    if (n.includes('internet') || n.includes('wifi')) return <Wifi size={24} />;
    if (n.includes('aluguel') || n.includes('condomínio')) return <Home size={24} />;
    if (n.includes('academia') || n.includes('gym')) return <Dumbbell size={24} />;
    return <Zap size={24} />;
  };

  return (
    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm flex flex-col justify-end" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="bg-surface rounded-t-[2.5rem] w-full max-w-2xl mx-auto shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle & Header */}
        <div className="pt-4 pb-6 px-8">
          <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-8" />
          <div className="flex justify-between items-center">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Próximos Vencimentos</h2>
            <button 
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest active:scale-95 transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-8 pb-12 overflow-y-auto space-y-4 scrollbar-hide">
          {bills.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-tertiary-container/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-tertiary" />
              </div>
              <p className="font-bold text-on-surface-variant italic">Nenhum vencimento pendente.</p>
            </div>
          ) : (
            bills.map(bill => {
              const daysLeft = bill.due_day - today;
              const isUrgent = daysLeft <= 2;
              
              return (
                <div key={bill.id} className="bg-surface-container-lowest p-6 rounded-[2rem] flex items-center justify-between border border-surface-container shadow-sm group hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                      {getIcon(bill.name)}
                    </div>
                    <div>
                      <h3 className="font-headline text-lg font-bold text-on-surface">{bill.name}</h3>
                      <p className={`font-body text-sm font-bold ${isUrgent ? 'text-error' : 'text-on-surface-variant'}`}>
                        {daysLeft === 0 ? 'Vence hoje' : daysLeft < 0 ? `Atrasado ${Math.abs(daysLeft)} dias` : `Vence em ${daysLeft} dias`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="font-headline text-xl font-black text-on-surface">{fmt(bill.value)}</p>
                    <button 
                      onClick={() => onPay(bill)}
                      className="px-6 py-2 bg-primary text-on-primary rounded-full font-label text-[10px] font-black uppercase tracking-[0.15em] hover:brightness-110 active:scale-90 transition-all shadow-lg shadow-primary/20"
                    >
                      Pagar
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Subtle Finish Hint */}
          <div className="flex flex-col items-center py-8">
            <div className="w-10 h-10 rounded-full bg-tertiary-container/40 flex items-center justify-center mb-3">
              <CheckCircle2 size={16} className="text-tertiary" />
            </div>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black text-center opacity-60">Fim da lista da semana</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillsModal;
