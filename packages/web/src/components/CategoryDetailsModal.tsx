import React, { useState, useEffect, useMemo } from 'react';
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card bg-surface-container-lowest"
        onClick={e => e.stopPropagation()}
        style={{ borderRadius: '2rem 2rem 0 0', padding: '16px 24px 48px', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-handle bg-on-surface/10 w-12 h-1.5 mb-6 mx-auto" />
        
        {/* Header fixo */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <h2 className="font-headline text-xl font-black text-on-surface">{category}</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Total</p>
            <p className="font-headline font-black text-lg text-on-surface">{fmt(total)}</p>
          </div>
        </div>

        {/* Lista com scroll */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {loading ? (
            <div className="flex justify-center p-8 opacity-50"><p>Carregando...</p></div>
          ) : txs.length === 0 ? (
            <div className="p-10 text-center"><p className="text-on-surface-variant opacity-60">Nenhuma transação encontrada.</p></div>
          ) : (
            Object.entries(grouped).map(([sub, txs]) => (
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
