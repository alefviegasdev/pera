import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, CheckCircle2, ChevronDown, Calendar, Trash2 } from 'lucide-react';
import { BANK_COLORS, catEmoji } from '../utils/categories';
import InstallmentsModal from '../components/InstallmentsModal';

const Cards = ({
  userId,
  onModalOpen,
  onModalClose
}: {
  userId: string;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) => {
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [creditCardBills, setCreditCardBills] = useState<any[]>([]);
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [showInstallments, setShowInstallments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payingBill, setPayingBill] = useState(false);
  const cardSwipeRef = useRef<HTMLDivElement>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const cardDragStartRef = useRef<number | null>(null);
  const cardDragStartYRef = useRef<number | null>(null);
  const cardDragXRef = useRef(0);
  const [cardDragX, setCardDragX] = useState(0);
  const [cardDragStart, setCardDragStart] = useState<number | null>(null);

  useEffect(() => {
    if (showInstallments) onModalOpen?.();
    else onModalClose?.();
  }, [showInstallments]);

  useEffect(() => { fetchData(); }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [userId]);

  // Card swipe logic (igual ao da Home)
  useEffect(() => {
    const el = cardSwipeRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      cardDragStartRef.current = e.touches[0].clientX;
      cardDragStartYRef.current = e.touches[0].clientY;
      isHorizontalSwipe.current = null;
      cardDragXRef.current = 0;
      setCardDragX(0);
      setCardDragStart(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (cardDragStartRef.current === null || cardDragStartYRef.current === null) return;
      const dx = e.touches[0].clientX - cardDragStartRef.current;
      const dy = e.touches[0].clientY - cardDragStartYRef.current;
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10)
          isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy);
      }
      if (isHorizontalSwipe.current) {
        e.preventDefault();
        cardDragXRef.current = dx;
        setCardDragX(dx);
      }
    };
    const onTouchEnd = () => {
      if (isHorizontalSwipe.current && Math.abs(cardDragXRef.current) > 50 && creditCards.length > 1) {
        if (cardDragXRef.current < 0) setActiveCardIdx(i => (i + 1) % creditCards.length);
        else setActiveCardIdx(i => (i - 1 + creditCards.length) % creditCards.length);
      }
      setCardDragX(0);
      setCardDragStart(null);
      cardDragStartRef.current = null;
      cardDragStartYRef.current = null;
      isHorizontalSwipe.current = null;
      cardDragXRef.current = 0;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [creditCards.length]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ccRes, ccBillsRes, txRes, instRes] = await Promise.all([
        fetch(`/api/credit-cards?user_id=${userId}`),
        fetch(`/api/credit-card-bills?user_id=${userId}`),
        fetch(`/api/transactions?user_id=${userId}&period=month`),
        fetch(`/api/installments?user_id=${userId}`)
      ]);
      const ccData = await ccRes.json();
      const ccBillsData = await ccBillsRes.json();
      const txData = await txRes.json();
      const instData = await instRes.json();
      setCreditCards(Array.isArray(ccData) ? ccData : []);
      setCreditCardBills(Array.isArray(ccBillsData) ? ccBillsData : []);
      setTransactions(txData.transactions || []);
      setInstallments(Array.isArray(instData) ? instData : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';

  const activeCard = creditCards[activeCardIdx];
  const activeBill = activeCard
    ? creditCardBills.find(b => b.credit_card_id === activeCard.id && !b.paid)
    : null;
  const paidBills = activeCard
    ? creditCardBills.filter(b => b.credit_card_id === activeCard.id && b.paid)
    : [];

  // Transações da fatura atual
  const billTransactions = activeBill
    ? transactions.filter(t =>
        t.credit_card_id === activeCard?.id &&
        t.billing_month === activeBill.billing_month
      )
    : [];

  // Agrupar por data
  const grouped: Record<string, any[]> = {};
  billTransactions.forEach(t => {
    const d = new Date(t.occurred_at);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const handlePayBill = async () => {
    if (!activeBill || !activeCard) return;
    setPayingBill(true);
    try {
      await fetch(`/api/credit-card-bills/${activeBill.id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      fetchData(true);
    } catch (e) { console.error(e); }
    finally { setPayingBill(false); }
  };

  if (loading) return (
    <div className="screen bg-surface">
      <header className="page-header pt-12 pb-4 px-6">
        <h1 className="font-headline tracking-tighter text-on-surface text-4xl font-black">Cartões</h1>
      </header>
      <div className="px-6 space-y-4">
        <div className="skeleton h-56 w-full rounded-[2rem]" />
        <div className="skeleton h-40 w-full rounded-[2rem]" />
      </div>
    </div>
  );

  if (creditCards.length === 0) return (
    <div className="screen bg-surface">
      <header className="page-header pt-12 pb-4 px-6">
        <h1 className="font-headline tracking-tighter text-on-surface text-4xl font-black">Cartões</h1>
      </header>
      <div className="px-6 pt-20 flex flex-col items-center text-center gap-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <CreditCard size={36} className="text-primary" />
        </div>
        <p className="font-headline font-black text-on-surface text-xl">Nenhum cartão cadastrado</p>
        <p className="text-on-surface-variant text-sm">Adicione um cartão em Ajustes para ver suas faturas aqui.</p>
      </div>
    </div>
  );

  return (
    <div className="screen bg-surface pb-32">
      <header className="w-full sticky top-0 z-40 bg-[#f7f6f1]/70 backdrop-blur-xl px-6 py-4">
        <h1 className="font-headline tracking-tighter text-on-surface text-4xl font-black">Cartões</h1>
      </header>

      <main className="px-6 pt-4 space-y-8">

        {/* Deck de cartões */}
        <section className="space-y-4">
          <div
            ref={cardSwipeRef}
            className="relative w-full select-none"
            style={{ height: 220, touchAction: 'pan-y pinch-zoom' }}
          >
            {creditCards.map((card, idx) => {
              const bill = creditCardBills.find(b => b.credit_card_id === card.id && !b.paid);
              const currentBill = Number(bill?.amount || 0);
              const cardLimit = Number(card.card_limit || 0);
              const cardAvailable = cardLimit - currentBill;
              const usedPct = cardLimit > 0 ? Math.min(100, (currentBill / cardLimit) * 100) : 0;
              const colors = BANK_COLORS[card.bank] || { from: '#1a1a2e', to: '#16213e', text: '#ffffff' };
              const relIdx = (idx - activeCardIdx + creditCards.length) % creditCards.length;
              const isFront = relIdx === 0;
              const isSecond = relIdx === 1;
              const isThird = relIdx === 2;
              if (!isFront && !isSecond && !isThird) return null;
              const zIndex = isFront ? 20 : isSecond ? 10 : 0;
              const scale = isFront ? 1 : isSecond ? 0.94 : 0.88;
              const baseTranslateX = isFront ? 0 : isSecond ? 25 : 45;
              const opacity = isFront ? 1 : isSecond ? 0.7 : 0.4;
              const dragOffset = isFront ? cardDragX : 0;
              return (
                <div
                  key={card.id}
                  className="absolute left-0 right-0 rounded-[2rem] overflow-hidden shadow-2xl border border-white/20"
                  style={{
                    zIndex,
                    transform: `scale(${scale}) translateX(${dragOffset + baseTranslateX}px)`,
                    transformOrigin: 'center right',
                    opacity,
                    transition: cardDragStart !== null && isFront ? 'none' : 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                    background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                    color: colors.text
                  }}
                >
                  <div className="px-6 py-6">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-lg font-headline font-black" style={{ color: colors.text }}>{card.bank}</p>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Vencimento Dia {card.due_day}</p>
                        <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Fechamento Dia {card.closing_day}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold uppercase opacity-70">Fatura atual</p>
                          <p className="text-2xl font-headline font-black">{fmt(currentBill)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase opacity-70">Disponível</p>
                          <p className="text-sm font-bold">{fmt(cardAvailable)}</p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        <div className="h-full rounded-full" style={{ width: `${usedPct}%`, backgroundColor: 'rgba(255,255,255,0.8)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {creditCards.length > 1 && (
            <div className="flex justify-center gap-1.5 -mt-2">
              {creditCards.map((_, i) => (
                <button key={i} onClick={() => setActiveCardIdx(i)}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === activeCardIdx ? 20 : 6, height: 6,
                    backgroundColor: i === activeCardIdx ? '#5d3fd3' : '#adada9' }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Fatura atual */}
        {activeCard && (
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-headline font-extrabold text-xl text-on-surface">Fatura Atual</h2>
              {activeBill && (
                <span className="text-xs font-bold text-on-surface-variant">
                  Vence dia {new Date(activeBill.due_date).getDate()}
                </span>
              )}
            </div>

            {activeBill ? (
              <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-surface-container/30">
                {Object.keys(grouped).length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-on-surface-variant text-sm opacity-60">Nenhuma transação nesta fatura.</p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([date, items]) => (
                    <div key={date}>
                      <div className="px-6 py-2 bg-surface-container-low/50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{date}</p>
                      </div>
                      {items.map(t => (
                        <div key={t.id} className="px-6 py-4 flex items-center justify-between border-b border-surface-container/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-lg">
                              {catEmoji(t.category)}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-on-surface">{t.description}</p>
                              <p className="text-xs text-on-surface-variant">{t.category}</p>
                            </div>
                          </div>
                          <p className="font-bold text-on-surface">− {fmt(t.value)}</p>
                        </div>
                      ))}
                    </div>
                  ))
                )}
                <div className="p-6 flex items-center justify-between border-t border-surface-container/30">
                  <div>
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Total da fatura</p>
                    <p className="font-headline font-black text-2xl text-on-surface">{fmt(activeBill.amount)}</p>
                  </div>
                  <button
                    onClick={handlePayBill}
                    disabled={payingBill}
                    className="bg-primary text-on-primary px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {payingBill ? 'Pagando...' : 'Pagar fatura'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-sm border border-surface-container/30">
                <CheckCircle2 size={32} className="text-tertiary mx-auto mb-3" />
                <p className="font-bold text-on-surface">Fatura paga!</p>
                <p className="text-xs text-on-surface-variant mt-1">Nenhuma fatura aberta para este cartão.</p>
              </div>
            )}
          </section>
        )}

        {/* Parcelamentos Ativos */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-headline font-extrabold text-xl text-on-surface">Parcelamentos Ativos</h2>
            <button
              onClick={() => setShowInstallments(true)}
              className="text-primary text-xs font-black uppercase tracking-wider"
            >
              Ver todos
            </button>
          </div>
          {installments.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-[2rem] border border-dashed border-outline-variant text-center">
              <p className="text-xs text-on-surface-variant opacity-60">Nenhum parcelamento ativo.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
              {installments.slice(0, 3).map(inst => (
                <div key={inst.id} className="min-w-[280px] bg-primary text-on-primary rounded-[2rem] p-7 relative overflow-hidden shadow-md shadow-primary/10">
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <circle cx="90" cy="10" fill="white" r="40" />
                      <circle cx="10" cy="90" fill="white" r="30" />
                    </svg>
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-on-primary/60 text-[10px] uppercase tracking-[0.2em] font-black mb-1">{inst.category}</p>
                        <h4 className="font-headline font-bold text-xl leading-tight truncate max-w-[160px]">{inst.description}</h4>
                      </div>
                      <div className="bg-on-primary/15 rounded-full px-3.5 py-1.5 text-[11px] font-black">
                        {inst.current_installment}/{inst.total_installments}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 w-full bg-on-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary-container rounded-full"
                          style={{ width: `${(inst.current_installment / inst.total_installments) * 100}%` }} />
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
          )}
        </section>

        {/* Histórico de faturas */}
        {paidBills.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-headline font-extrabold text-xl text-on-surface">Faturas Anteriores</h2>
            <div className="space-y-3">
              {paidBills.map(bill => (
                <div key={bill.id} className="bg-white rounded-[2rem] p-5 flex items-center justify-between shadow-sm border border-surface-container/30">
                  <div>
                    <p className="font-bold text-on-surface">
                      {new Date(bill.billing_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-tertiary font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} fill="currentColor" />
                      Pago em {new Date(bill.paid_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <p className="font-headline font-black text-on-surface">{fmt(bill.amount)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {showInstallments && (
        <InstallmentsModal userId={userId} onClose={() => setShowInstallments(false)} />
      )}
    </div>
  );
};

export default Cards;
