import React, { useState } from 'react';
import { X, Globe, ShieldAlert, Home, PlusCircle } from 'lucide-react';

interface NewGoalModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: 'Viagem', icon: Globe, label: 'Viagem', colorClass: 'peer-checked:bg-tertiary-container peer-checked:text-on-tertiary-container' },
  { id: 'Emergência', icon: ShieldAlert, label: 'Emergência', colorClass: 'peer-checked:bg-secondary-container peer-checked:text-on-secondary-container' },
  { id: 'Imóvel', icon: Home, label: 'Imóvel', colorClass: 'peer-checked:bg-primary-container peer-checked:text-on-primary-container' },
  { id: 'Outros', icon: PlusCircle, label: 'Outros', colorClass: 'peer-checked:bg-outline-variant/20 peer-checked:text-on-surface' },
];

const NewGoalModal: React.FC<NewGoalModalProps> = ({ userId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [category, setCategory] = useState('Viagem');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NewGoalModal] Submitting:', { name, targetValue, category, userId });
    if (!name || !targetValue) {
      console.log('[NewGoalModal] Validation failed: missing name or targetValue');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name,
          target_value: parseFloat(targetValue),
          current_value: 0,
          category
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
        className="modal-card bg-surface-container-lowest animate-in slide-in-from-bottom duration-500 ease-out" 
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '2rem 2rem 0 0', padding: '16px 32px 48px' }}
      >
        <div className="modal-handle bg-on-surface/10 w-12 h-1.5 mb-8" />
        
        <header className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">Nova Meta de Economia</h2>
            <p className="text-on-surface-variant/70 font-medium mt-1">Defina seus próximos grandes passos financeiros.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary px-1">Nome da Meta</label>
            <input 
              className="w-full bg-transparent border-0 border-b-2 border-outline-variant/30 py-3 text-lg font-semibold focus:ring-0 focus:border-primary transition-all placeholder:text-outline-variant/40" 
              placeholder="Ex: Viagem para o Japão, Reserva de Emergência" 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary px-1">Valor Objetivo</label>
            <div className="relative flex items-center border-b-2 border-outline-variant/30 focus-within:border-primary transition-all pb-2">
              <span className="text-2xl font-extrabold text-on-surface mr-2">R$</span>
              <input 
                className="w-full bg-transparent border-none p-0 text-4xl font-extrabold tracking-tighter focus:ring-0 placeholder:text-outline-variant/30" 
                placeholder="0,00" 
                type="number"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-primary px-1">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <label key={cat.id} className="cursor-pointer group">
                    <input 
                      className="hidden peer" 
                      name="category" 
                      type="radio" 
                      checked={category === cat.id}
                      onChange={() => setCategory(cat.id)}
                    />
                    <div className={`px-5 py-2.5 rounded-full bg-surface-container-low text-on-surface-variant font-bold ${cat.colorClass} group-hover:bg-surface-container-high transition-all flex items-center gap-2`}>
                      <Icon size={18} />
                      <span>{cat.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-5 text-on-surface-variant font-bold hover:bg-surface-container-low rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] bg-primary py-5 rounded-xl text-on-primary font-extrabold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewGoalModal;
