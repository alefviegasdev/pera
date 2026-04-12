import React, { useState } from 'react';
import { X, Utensils, ShoppingBag, Car, Film, Dumbbell, Stethoscope, Home } from 'lucide-react';

interface NewBudgetModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ICONS = [
  { id: 'Utensils', icon: Utensils, label: 'Alimentação' },
  { id: 'ShoppingBag', icon: ShoppingBag, label: 'Compras' },
  { id: 'Car', icon: Car, label: 'Transporte' },
  { id: 'Film', icon: Film, label: 'Lazer' },
  { id: 'Dumbbell', icon: Dumbbell, label: 'Fitness' },
  { id: 'Stethoscope', icon: Stethoscope, label: 'Saúde' },
  { id: 'Home', icon: Home, label: 'Casa' },
];

const NewBudgetModal: React.FC<NewBudgetModalProps> = ({ userId, onClose, onSuccess }) => {
  const [limit, setLimit] = useState('');
  const [category, setCategory] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Utensils');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NewBudgetModal] Submitting:', { limit, category, selectedIcon, userId });
    if (!limit || !category) {
      console.log('[NewBudgetModal] Validation failed: missing limit or category');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          category,
          limit_value: parseFloat(limit),
          icon: selectedIcon
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-card bg-surface-container-lowest" 
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '2rem 2rem 0 0', padding: '16px 32px 48px' }}
      >
        <div className="modal-handle bg-surface-container-high w-16 h-1.5 mb-6" />
        
        <header className="mb-8">
          <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Novo Orçamento Mensal</h2>
          <p className="font-body text-on-surface-variant/70 text-sm mt-1">Defina seus limites e organize suas finanças.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Large Amount Input */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Limite Mensal (R$)</label>
            <div className="relative flex items-center border-b-2 border-outline-variant/20 focus-within:border-primary transition-colors pb-2">
              <span className="font-headline text-3xl font-bold text-on-surface-variant/40 mr-2">R$</span>
              <input 
                className="w-full bg-transparent border-none focus:ring-0 font-headline text-5xl font-black text-on-surface p-0 placeholder:text-surface-variant" 
                placeholder="0,00" 
                type="number"
                step="0.01"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category Input */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Categoria do Gasto</label>
            <input 
              className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary transition-colors py-3 font-label text-lg font-medium text-on-surface placeholder:text-surface-variant" 
              placeholder="Ex: Alimentação" 
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-3">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Ícone da Categoria</label>
            <div className="flex overflow-x-auto gap-4 py-2 scrollbar-hide">
              {ICONS.map((item) => {
                const isActive = selectedIcon === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-110' 
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
                    }`}
                  >
                    <Icon size={24} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-headline font-bold py-5 rounded-full text-lg shadow-xl shadow-primary/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Criar Orçamento'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full text-on-surface-variant font-label font-bold py-3 active:opacity-60 transition-opacity"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBudgetModal;
