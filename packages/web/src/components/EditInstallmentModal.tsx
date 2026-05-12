import React, { useState, useRef } from 'react';
import { CreditCard, PlusCircle } from 'lucide-react';
import { BANK_COLORS } from '../utils/categories';

interface Props {
  inst: any;
  creditCards: any[];
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EditInstallmentModal = ({ inst, creditCards, userId, onClose, onSuccess }: Props) => {
  const [totalValue, setTotalValue] = useState(String(inst.total_value || ''));
  const [totalInstallments, setTotalInstallments] = useState(String(inst.total_installments || ''));
  const [selectedCardId, setSelectedCardId] = useState<string | null>(inst.credit_card_id || null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartY, setDragStartY] = useState<number | null>(null);

  const instValue = totalValue && totalInstallments
    ? (parseFloat(totalValue) / parseInt(totalInstallments)).toFixed(2)
    : '0.00';

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/installments/${inst.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_value: parseFloat(totalValue) || inst.total_value,
          installment_value: parseFloat(instValue),
          total_installments: parseInt(totalInstallments) || inst.total_installments,
          credit_card_id: selectedCardId || null,
          user_id: userId
        })
      });
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface rounded-t-[2.5rem] flex flex-col"
        style={{
          height: '80dvh',
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? 'none' : 'transform 0.3s ease'
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => setDragStartY(e.touches[0].clientY)}
        onTouchMove={e => {
          if (modalRef.current && modalRef.current.scrollTop > 0) return;
          if (dragStartY !== null) {
            const delta = e.touches[0].clientY - dragStartY;
            if (delta > 0) setDragOffset(delta);
          }
        }}
        onTouchEnd={() => {
          if (dragOffset > 120) onClose();
          setDragOffset(0); setDragStartY(null);
        }}
      >
        <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />
        <div ref={modalRef} className="flex-1 overflow-y-auto px-6 pb-8 space-y-6">
          <div className="pt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Editar Parcelamento</p>
            <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight">{inst.description}</h2>
          </div>

          <div className="space-y-4">
            {/* Valor total */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Valor Total (R$)</label>
              <input
                type="number"
                value={totalValue}
                onChange={e => setTotalValue(e.target.value)}
                placeholder="0,00"
                className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Total de parcelas */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Número de Parcelas</label>
              <input
                type="number"
                value={totalInstallments}
                onChange={e => setTotalInstallments(e.target.value)}
                placeholder="12"
                className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Preview valor da parcela */}
            {totalValue && totalInstallments && (
              <div className="bg-primary/5 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Valor por parcela</span>
                <span className="font-headline font-black text-primary text-lg">R$ {instValue}</span>
              </div>
            )}

            {/* Cartão */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Cartão de Crédito</label>

              <div
                onClick={() => setSelectedCardId(null)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedCardId === null ? 'border-primary bg-primary/5' : 'border-surface-container bg-surface-container-low'}`}
              >
                <div className="w-8 h-8 rounded-full bg-on-surface/10 flex items-center justify-center text-sm">🏦</div>
                <span className="font-bold text-sm text-on-surface">Sem cartão / Outros</span>
              </div>

              {creditCards.map(card => {
                const colors = (BANK_COLORS as any)[card.bank] || { from: '#1a1a2e', to: '#16213e', text: '#ffffff' };
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedCardId === card.id ? 'border-primary bg-primary/5' : 'border-surface-container bg-surface-container-low'}`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                    >
                      <CreditCard size={14} style={{ color: colors.text }} />
                    </div>
                    <span className="font-bold text-sm text-on-surface">{card.bank}</span>
                  </div>
                );
              })}

              <button
                onClick={() => window.location.href = '/settings'}
                className="flex items-center gap-2 text-primary font-bold text-sm px-4 py-3 rounded-2xl border-2 border-dashed border-primary/30 w-full hover:bg-primary/5 transition-colors active:scale-95"
              >
                <PlusCircle size={16} />
                Cadastrar novo cartão
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              disabled={saving}
              onClick={handleSave}
              className="w-full h-14 bg-primary text-on-primary rounded-full font-headline font-black text-base shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-on-surface-variant font-bold text-sm active:scale-95 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditInstallmentModal;
