import React, { useState } from 'react';
import { X, Home, Wrench, GraduationCap, Car, Calendar, DollarSign } from 'lucide-react';

interface NewBillModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: 'Moradia', icon: Home, label: 'Moradia' },
  { id: 'Contas', icon: Wrench, label: 'Contas' },
  { id: 'Educação', icon: GraduationCap, label: 'Educação' },
  { id: 'Transporte', icon: Car, label: 'Transporte' },
];

const NewBillModal: React.FC<NewBillModalProps> = ({ userId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [dueDay, setDueDay] = useState('05');
  const [category, setCategory] = useState('Moradia');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NewBillModal] Submitting:', { name, value, dueDay, category, userId });
    if (!name || !value) {
      console.log('[NewBillModal] Validation failed: missing name or value');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const res = await fetch('/api/monthly-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name,
          value: parseFloat(value),
          due_day: parseInt(dueDay),
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          paid: false,
          short_code: shortCode,
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
        className="modal-card bg-surface-container-lowest" 
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '3.5rem 3.5rem 0 0', padding: '12px 32px 48px' }}
      >
        <div className="modal-handle bg-surface-container-high w-16 h-1.5" />
        
        <div className="mt-4 mb-8">
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Nova Conta Fixa</h2>
          <p className="font-body text-sm text-on-surface-variant/70 leading-relaxed max-w-[85%] mt-1">
            Cadastre seus compromissos recorrentes para melhor previsão mensal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="relative group">
            <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">NOME DA CONTA</label>
            <input 
              className="w-full bg-transparent border-0 border-b border-outline-variant/30 py-3 font-headline font-semibold text-lg focus:ring-0 focus:border-primary transition-colors placeholder:text-outline-variant/40" 
              placeholder="Ex: Aluguel ou Internet" 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="relative">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">VALOR ESTIMADO (R$)</label>
              <div className="flex items-center border-b border-outline-variant/30 py-3 focus-within:border-primary transition-colors">
                <span className="font-headline font-bold text-primary mr-2 text-lg">R$</span>
                <input 
                  className="w-full bg-transparent border-none p-0 font-headline font-bold text-lg focus:ring-0 placeholder:text-outline-variant/40" 
                  placeholder="0,00" 
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="relative">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">DIA DE VENCIMENTO</label>
              <div className="flex items-center border-b border-outline-variant/30 py-3 focus-within:border-primary transition-colors">
                <Calendar size={20} className="text-outline-variant mr-2" />
                <select 
                  className="w-full bg-transparent border-none p-0 font-headline font-bold text-lg appearance-none cursor-pointer focus:ring-0"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                >
                  <option value="01">01</option>
                  <option value="05">05</option>
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="20">20</option>
                  <option value="25">25</option>
                  <option value="30">30</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">CATEGORIA</label>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-2 px-2 py-1">
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full transition-all active:scale-95 ${
                      isActive 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="font-body text-xs font-bold">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-5 rounded-full font-headline font-bold text-base shadow-[0_10px_25px_rgba(93,63,211,0.25)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Adicionando...' : 'Adicionar Conta'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full bg-transparent text-on-surface-variant py-4 rounded-full font-headline font-bold text-sm hover:text-on-surface active:scale-95 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBillModal;
