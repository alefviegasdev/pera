import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, Layers, Zap, Trash2, Hash, Pencil } from 'lucide-react';
import { catColor } from '../utils/categories';

interface TransactionModalProps {
  tx: any;
  onRefresh?: () => void;
  onClose: () => void;
}

const fmt = (n: number) =>
  n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

const getInitials = (str: string) => {
  if (!str) return 'TX';
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || '') + (parts[2]?.[0] || '')).toUpperCase();
};

const TransactionModal: React.FC<TransactionModalProps> = ({ tx, onRefresh, onClose }) => {
  const color = catColor(tx.category);
  const isIncome = tx.type === 'income';
  const initials = getInitials(tx.description);

  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(tx.value));
  const [editCategory, setEditCategory] = useState(tx.category);

  const CATEGORIES = ['Alimentação','Fast Food','Transporte','Saúde',
    'Lazer','Educação','Contas','Vestuário','Eletrônicos',
    'Dízimo/Oferta','Outros'];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
      onRefresh?.();
      onClose();
    } catch(e) { console.error(e); }
    finally { setDeleting(false); }
  };

  const handleSaveEdit = async () => {
    try {
      await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          value: parseFloat(editValue), 
          category: editCategory 
        })
      });
      onRefresh?.();
      onClose();
    } catch(e) { console.error(e); }
  };

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

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, overflowX: 'hidden' }}>
      <div 
        className="modal-card scrollbar-hide" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          borderRadius: '2.5rem',
          height: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? 'none' : 'transform 0.3s ease'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="modal-handle" />

        <div className="overflow-y-auto flex-1 scrollbar-hide" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y', overflowX: 'hidden' }}>

        {/* Header Section */}
        <div className="flex items-start gap-5 mb-8">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center font-headline font-black tracking-tighter text-sm flex-shrink-0"
            style={{ backgroundColor: color + '22', color: color }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                style={{ borderColor: color + '44', color: color, backgroundColor: color + '08' }}
              >
                {tx.category}
              </span>
              {tx.short_code && (
                <div className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant opacity-40">
                  <Hash size={8} />
                  <span>{tx.short_code}</span>
                </div>
              )}
            </div>
            <h2 className="font-headline text-2xl font-extrabold text-on-surface leading-tight truncate">
              {tx.description}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Magnitude Display */}
        <div className="bg-surface-container-low p-8 rounded-[2rem] border border-surface-container text-center mb-6">
          <p className="font-black text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/40 mb-2">Impacto Financeiro</p>
          <p 
            className="font-display font-black tracking-tighter"
            style={{ fontSize: 42, color: isIncome ? '#354900' : 'var(--on-surface)' }}
          >
            {isIncome ? '+' : '−'} {fmt(tx.value)}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <div className="bg-white/50 border border-surface-container p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 opacity-40">
              <Calendar size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">Data</span>
            </div>
            <p className="font-bold text-sm text-on-surface">
              {new Date(tx.occurred_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </p>
          </div>
          <div className="bg-white/50 border border-surface-container p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 opacity-40">
              <Layers size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">Classificação</span>
            </div>
            <p className="font-bold text-sm text-on-surface">
              {tx.subtype === 'fixed' ? 'Conta Fixa' : tx.subtype === 'semifixed' ? 'Semi-fixo' : 'Variável'}
            </p>
          </div>
          <div className="bg-white/50 border border-surface-container p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 opacity-40">
              <Zap size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">Prioridade</span>
            </div>
            <p className="font-bold text-sm text-on-surface">
              {tx.urgency === 'urgent' ? '🔴 Urgente' : '🟢 Normal'}
            </p>
          </div>
          <div className="bg-white/50 border border-surface-container p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 opacity-40">
              <Tag size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">Categoria</span>
            </div>
            <p className="font-bold text-sm text-on-surface truncate">{tx.category}</p>
          </div>
        </div>

        {/* Action Center */}
        <div className="flex flex-col gap-3">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="h-14 w-full bg-surface-container-low text-on-surface rounded-full font-bold text-base active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Pencil size={18} />
                Editar transação
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-14 w-full flex items-center justify-center gap-2 text-error font-black text-xs uppercase tracking-widest hover:bg-error/5 rounded-full transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? 'Removendo...' : 'Remover do registro'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Valor (R$)</label>
                <input
                  type="number"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-headline font-bold text-xl text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Categoria</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full h-14 bg-surface-container-low rounded-2xl px-4 font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/20"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 h-14 bg-surface-container-low text-on-surface-variant rounded-full font-bold active:scale-95 transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-[2] h-14 bg-primary text-on-primary rounded-full font-bold text-base shadow-lg active:scale-95 transition-transform"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
