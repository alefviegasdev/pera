import React from 'react';
import { X, Tag, Calendar, Layers, Zap, Trash2 } from 'lucide-react';
import { catColor, catEmoji } from '../utils/categories';

interface TransactionModalProps {
  tx: any;
  onClose: () => void;
}

const fmt = (n: number) =>
  n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

const TransactionModal: React.FC<TransactionModalProps> = ({ tx, onClose }) => {
  const color = catColor(tx.category);
  const emoji = catEmoji(tx.category);
  const isIncome = tx.type === 'income';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className="cat-bubble"
            style={{ background: color + '22' }}
          >
            <span style={{ fontSize: 22 }}>{emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label mb-1">{tx.category}</p>
            <h2
              className="font-display truncate"
              style={{ fontSize: 22, lineHeight: 1.2 }}
            >
              {tx.description}
            </h2>
            {tx.short_code && (
              <span className="text-xs text-muted font-mono mt-0.5 block">
                #{tx.short_code}
              </span>
            )}
          </div>
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-container)' }}
          >
            <X size={16} color="var(--on-surface-variant)" />
          </button>
        </div>

        {/* Big value */}
        <div className="card-low mb-4 text-center" style={{ borderRadius: '1.25rem' }}>
          <p className="text-label mb-1">Valor</p>
          <p
            className="font-display"
            style={{
              fontSize: 36,
              color: isIncome ? '#354900' : 'var(--on-surface)',
            }}
          >
            {isIncome ? '+' : '−'} {fmt(tx.value)}
          </p>
        </div>

        {/* Detail grid */}
        <div className="detail-grid">
          <div className="detail-cell">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={11} color="var(--outline-variant)" />
              <p className="detail-label">Data</p>
            </div>
            <p className="detail-value">
              {new Date(tx.occurred_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="detail-cell">
            <div className="flex items-center gap-1.5 mb-1">
              <Tag size={11} color="var(--outline-variant)" />
              <p className="detail-label">Categoria</p>
            </div>
            <p className="detail-value">{tx.category}</p>
          </div>
          <div className="detail-cell">
            <div className="flex items-center gap-1.5 mb-1">
              <Layers size={11} color="var(--outline-variant)" />
              <p className="detail-label">Tipo</p>
            </div>
            <p className="detail-value">
              {tx.subtype === 'fixed'
                ? 'Fixo'
                : tx.subtype === 'semifixed'
                ? 'Semi-fixo'
                : 'Variável'}
            </p>
          </div>
          <div className="detail-cell">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={11} color="var(--outline-variant)" />
              <p className="detail-label">Urgência</p>
            </div>
            <p className="detail-value">
              {tx.urgency === 'urgent' ? '🔴 Urgente' : '🟢 Normal'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            id="modal-confirm-btn"
            className="btn btn-primary w-full"
            onClick={onClose}
          >
            Fechar
          </button>
          <button
            id="modal-delete-btn"
            className="btn btn-ghost w-full flex items-center justify-center gap-2"
          >
            <Trash2 size={15} />
            Apagar transação
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
