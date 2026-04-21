import React, { useState, useEffect } from 'react';

const TitheDetailsModal = ({ userId, titheSummary, onClose }: { userId: string, titheSummary: any, onClose: () => void }) => {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [removingIncome, setRemovingIncome] = useState<any | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current?.contains(e.target as Node)) return;
    setDragStart(e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart === null) return;
    if (contentRef.current?.contains(e.target as Node)) return;
    const y = e.touches[0].clientY;
    const diff = y - dragStart;
    if (diff > 0) setDragOffset(diff);
  };
  const handleTouchEnd = () => {
    if (dragOffset > window.innerHeight * 0.85 * 0.3) {
      onClose();
    } else {
      setDragOffset(0);
    }
    setDragStart(null);
  };

  const fmt = (n: number) => n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end animate-in fade-in duration-300">
      <div className="flex-1" onClick={onClose} />
      <div 
        className="bg-white rounded-t-[2.5rem] w-full flex flex-col overflow-hidden pointer-events-auto shadow-2xl"
        style={{ 
          height: '85dvh',
          transform: `translateY(${Math.max(0, dragOffset)}px)`,
          transition: dragStart === null ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full" />
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              🙏
            </div>
            <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">Dízimo</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="text-on-surface-variant font-bold text-lg">✕</span>
          </button>
        </div>

        <div className="flex border-b border-surface-container px-6 pt-2">
          <button 
            className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pendente
          </button>
          <button 
            className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
            onClick={() => setActiveTab('history')}
          >
            Histórico
          </button>
        </div>

        <div 
          ref={contentRef} 
          className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-6"
          style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
        >
          {activeTab === 'pending' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-surface-container-low p-4 rounded-[1.5rem]">
                  <p className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant mb-1">Total a dizimar</p>
                  <p className="font-headline text-lg font-bold text-on-surface">{fmt(titheSummary?.tithe_due || 0)}</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-[1.5rem]">
                  <p className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant mb-1">Já pago</p>
                  <p className="font-headline text-lg font-bold text-on-surface">{fmt(titheSummary?.total_paid || 0)}</p>
                </div>
              </div>

              <div className={`p-6 rounded-[2rem] border ${titheSummary?.balance_due <= 0 ? 'bg-primary/10 border-primary/20' : 'bg-white border-surface-container'} shadow-sm`}>
                <p className="text-xs uppercase font-black tracking-widest text-on-surface-variant mb-2">Saldo pendente</p>
                <p className={`font-headline text-4xl font-black ${titheSummary?.balance_due <= 0 ? 'text-primary' : 'text-on-surface'}`}>
                  {fmt(titheSummary?.balance_due || 0)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase font-black tracking-widest text-on-surface-variant mb-4 pl-2">Entradas que contam para dízimo</p>
                <div className="space-y-3">
                  {titheSummary?.titheable_incomes?.length === 0 ? (
                    <p className="text-sm font-medium text-on-surface-variant text-center py-4">Nenhuma entrada recente.</p>
                  ) : (
                    titheSummary?.titheable_incomes?.map((inc: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-4 bg-surface-container-low rounded-2xl">
                        <div className="flex-1">
                          <p className="font-bold text-on-surface">{inc.description}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            {new Date(inc.occurred_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <p className="font-headline font-black text-primary">{fmt(Number(inc.value))}</p>
                        <button
                          onClick={() => setRemovingIncome(inc)}
                          className="ml-2 w-8 h-8 rounded-full bg-error/10 flex items-center justify-center text-error hover:bg-error/20 transition-colors flex-shrink-0"
                        >
                          <span className="text-sm font-bold">×</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {titheSummary?.payments?.length === 0 ? (
                <p className="text-sm font-medium text-on-surface-variant text-center py-8">Nenhum pagamento registrado ainda.</p>
              ) : (
                titheSummary?.payments?.map((payment: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-surface-container-low rounded-2xl">
                    <div>
                      <p className="font-bold text-on-surface">{payment.description}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{new Date(payment.paid_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className="font-headline font-black text-on-surface">{fmt(Number(payment.value))}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {removingIncome && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6" onClick={() => setRemovingIncome(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <p className="text-2xl mb-3">⚠️</p>
              <h3 className="font-headline text-xl font-black text-on-surface mb-2">Retirar do cálculo?</h3>
              <p className="text-sm text-on-surface-variant">
                A entrada <span className="font-bold text-on-surface">"{removingIncome.description}"</span> de{' '}
                <span className="font-bold text-primary">{fmt(Number(removingIncome.value))}</span>{' '}
                não será mais considerada no cálculo do dízimo.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await fetch(`/api/transactions/${removingIncome.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ counts_for_tithe: false })
                  });
                  setRemovingIncome(null);
                  onClose();
                }}
                className="w-full bg-error text-white py-4 rounded-full font-bold active:scale-95 transition-all"
              >
                Sim, retirar
              </button>
              <button
                onClick={() => setRemovingIncome(null)}
                className="w-full text-on-surface-variant py-3 rounded-full font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TitheDetailsModal;
