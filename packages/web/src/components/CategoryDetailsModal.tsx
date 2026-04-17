import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { catEmoji } from '../utils/categories';

const HAS_SUBCATEGORIES = ['Alimentação', 'Fast Food', 'Saúde', 'Transporte'];

interface Transaction {
  id: string;
  value: number;
  description: string;
  occurred_at: string;
  type: string;
  category: string;
  subcategory?: string | null;
}

interface Props {
  category: string;
  period: string;
  userId: string;
  onClose: () => void;
}

export default function CategoryDetailsModal({ category, period, userId, onClose }: Props) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubcat, setActiveSubcat] = useState<string>('Geral');
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const fetchTxs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions?user_id=${userId}&period=${period}`);
        const data = await res.json();
        const filtered = (data.transactions || []).filter((t: Transaction) => t.type === 'expense' && t.category === category);
        setTxs(filtered);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTxs();
  }, [category, period, userId]);

  const total = txs.reduce((sum, t) => sum + Number(t.value), 0);
  const emoji = catEmoji(category);
  const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const hasSubCategories = HAS_SUBCATEGORIES.includes(category);

  const grouped = useMemo(() => {
    if (!hasSubCategories) {
      return { 'Geral': txs };
    }
    const map: Record<string, Transaction[]> = { 'Geral': [] };
    txs.forEach(t => {
      const sub = t.subcategory || 'Geral';
      if (!map[sub]) map[sub] = [];
      map[sub].push(t);
    });
    // Remove 'Geral' if empty
    if (map['Geral'].length === 0) delete map['Geral'];
    
    // Sort transactions within groups by date descending
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    });
    
    return map;
  }, [txs, hasSubCategories]);

  useEffect(() => {
    if (Object.keys(grouped).length > 0 && !grouped[activeSubcat]) {
      setActiveSubcat(grouped['Geral'] ? 'Geral' : Object.keys(grouped)[0]);
    }
  }, [grouped, activeSubcat]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart === null) return;
    const offset = e.touches[0].clientY - dragStart;
    if (offset > 0) setDragOffset(offset);
  };
  const handleTouchEnd = () => {
    if (dragOffset > 80) onClose();
    setDragStart(null);
    setDragOffset(0);
  };

  const subcatKeys = [
    ...(grouped['Geral'] ? ['Geral'] : []),
    ...Object.keys(grouped).filter(k => k !== 'Geral')
  ];
  const visibleGroups = { [activeSubcat]: grouped[activeSubcat] || [] };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ overflowX: 'hidden' }}>
      <div 
        className="modal-card bg-surface-container-lowest"
        onClick={e => e.stopPropagation()}
        style={{ 
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? 'none' : 'transform 0.3s ease',
          borderRadius: '2rem 2rem 0 0', 
          padding: '16px 24px 48px', 
          height: '85dvh', 
          display: 'flex', 
          flexDirection: 'column',
          overflowX: 'hidden'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="modal-handle bg-on-surface/10 w-12 h-1.5 mb-6 mx-auto" />
        
        {/* Header fixo */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <h2 className="font-headline text-xl font-black text-on-surface">{category}</h2>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Total</p>
              <p className="font-headline font-black text-lg text-on-surface">{fmt(total)}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-95 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {hasSubCategories && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2 flex-shrink-0">
            {subcatKeys.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubcat(sub)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
                  activeSubcat === sub 
                    ? 'bg-primary text-on-primary' 
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Lista com scroll */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1" style={{ overflowX: 'hidden', overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
          {loading ? (
            <div className="flex justify-center p-8 opacity-50"><p>Carregando...</p></div>
          ) : txs.length === 0 ? (
            <div className="p-10 text-center"><p className="text-on-surface-variant opacity-60">Nenhuma transação encontrada.</p></div>
          ) : (
            Object.entries(visibleGroups).map(([sub, txs]) => (
              <div key={sub}>
                {hasSubCategories && <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">{sub}</p>}
                {txs.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b border-surface-container/30 last:border-0 hover:bg-surface-container-low/50 px-2 -mx-2 rounded-xl transition-colors">
                    <div>
                      <p className="font-bold text-on-surface text-sm">{t.description}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {new Date(t.occurred_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <p className="font-black text-on-surface">{fmt(t.value)}</p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
