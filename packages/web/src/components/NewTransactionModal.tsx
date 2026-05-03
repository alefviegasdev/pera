import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewTransactionModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 
  'Contas', 'Vestuário', 'Eletrônicos', 'Dízimo/Oferta', 'Outros'
];

const SUBCATEGORIES: Record<string, string[]> = {
  'Alimentação': ['Mercado', 'Padaria'],
  'Lazer': ['Fast Food', 'Delivery', 'Restaurante', 'Lanchonete', 'Cafeteria', 'Doces', 'Petiscos', 'Cinema', 'Streaming', 'Jogos', 'Viagem', 'Outros'],
  'Saúde': ['Farmácia', 'Médico', 'Academia', 'Exames'],
  'Transporte': ['Uber/Táxi', 'Combustível', 'Transporte Público'],
};

const hasSubcategories = (cat: string) => !!SUBCATEGORIES[cat];

const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ userId, onClose, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'debit' | 'credit'>('debit');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  
  const [category, setCategory] = useState('Outros');
  const [subcategory, setSubcategory] = useState('');
  
  const [urgency, setUrgency] = useState<'urgent' | 'planned'>('planned');
  const [subtype, setSubtype] = useState<'variable' | 'semifixed' | 'fixed'>('variable');
  
  const [installments, setInstallments] = useState('1');
  const [creditCardId, setCreditCardId] = useState('');
  const [creditCards, setCreditCards] = useState<any[]>([]);
  
  const [dueDay, setDueDay] = useState('05');
  const [countsForTithe, setCountsForTithe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ultimate iOS scroll lock
    const appShell = document.querySelector('.app-shell') as HTMLElement;
    const body = document.body;
    let scrollY = 0;
    
    if (appShell) {
      scrollY = appShell.scrollTop;
      appShell.style.position = 'fixed';
      appShell.style.width = '100%';
      appShell.style.top = `-${scrollY}px`;
    }
    
    // Always lock body as fallback
    const bodyScrollY = window.scrollY;
    body.style.position = 'fixed';
    body.style.width = '100%';
    body.style.top = `-${bodyScrollY}px`;
    
    return () => { 
      if (appShell) {
        appShell.style.position = '';
        appShell.style.width = '';
        appShell.style.top = '';
        appShell.scrollTo(0, scrollY);
      }
      body.style.position = '';
      body.style.width = '';
      body.style.top = '';
      window.scrollTo(0, bodyScrollY);
    };
  }, []);

  useEffect(() => {
    // Reset subcategory when category changes
    if (hasSubcategories(category)) {
      setSubcategory(SUBCATEGORIES[category][0]);
    } else {
      setSubcategory('');
    }
  }, [category]);

  useEffect(() => {
    // Fetch credit cards
    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/credit-cards?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setCreditCards(data);
          if (data.length > 0) setCreditCardId(data[0].id);
        }
      } catch (e) { console.error(e); }
    };
    if (userId) fetchCards();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value) return;

    setLoading(true);
    try {
      const numValue = parseFloat(value.replace(',', '.'));

      if (subtype === 'fixed') {
        // Enviar para fixed-expenses
        const res = await fetch('/api/fixed-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            name: description,
            value: numValue,
            due_day: parseInt(dueDay),
            category
          })
        });
        if (res.ok) {
          onSuccess();
          onClose();
        }
      } else if (subtype === 'semifixed') {
        // Enviar para installments via Supabase Client
        // Semifixed => Installments table requires total_installments, installment_value, etc.
        const numInstallments = parseInt(installments) || 1;
        const instValue = numValue / numInstallments;
        
        const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();

        const { error } = await supabase.from('installments').insert({
          user_id: userId,
          description,
          total_value: numValue,
          installment_value: instValue,
          total_installments: numInstallments,
          current_installment: 0,
          category,
          subcategory: subcategory || null,
          credit_card_id: creditCardId || null,
          short_code: shortCode
        });
        
        if (!error) {
          onSuccess();
          onClose();
        }
      } else {
        // Variável => transaction comum
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            value: numValue,
            type,
            category,
            subcategory: subcategory || null,
            subtype: 'variable',
            urgency,
            description,
            source: 'app',
            short_code: Math.random().toString(36).substring(2, 6).toUpperCase(),
            payment_method: type === 'expense' ? paymentMethod : null,
            credit_card_id: (type === 'expense' && paymentMethod === 'credit') ? creditCardId : null,
            counts_for_tithe: type === 'income' ? countsForTithe : false
          })
        });
        if (res.ok) {
          onSuccess();
          onClose();
        }
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
        className="modal-card bg-surface-container-lowest max-h-[85vh] overflow-y-auto scrollbar-hide overscroll-contain transform-gpu touch-pan-y" 
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '2.5rem 2.5rem 0 0', padding: '12px 32px 0px', width: '100%', maxWidth: '480px' }}
      >
        <div className="modal-handle bg-surface-container-high w-16 h-1.5 mx-auto mb-6" />
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Nova Transação</h2>
            <p className="font-body text-sm text-on-surface-variant/70 leading-relaxed mt-1">
              Registre uma despesa, entrada ou parcelamento.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          
          {/* Tipo e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">TIPO</label>
              <div className="flex bg-surface-container-low p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'expense' ? 'bg-error text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  Saída
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'income' ? 'bg-[#465d0c] text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  Entrada
                </button>
              </div>
            </div>

            <div className="relative">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">VALOR (R$)</label>
              <input 
                className="w-full bg-surface-container-low rounded-2xl border-none p-3 font-headline font-bold text-lg focus:ring-2 focus:ring-primary/20 placeholder:text-outline-variant/40" 
                placeholder="0.00" 
                type="number"
                inputMode="decimal"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="relative">
            <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">DESCRIÇÃO</label>
            <input 
              className="w-full bg-transparent border-0 border-b border-outline-variant/30 py-3 font-headline font-semibold text-lg focus:ring-0 focus:border-primary transition-colors placeholder:text-outline-variant/40" 
              placeholder="Ex: Supermercado" 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

        {type === 'income' && (
          <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border-2 border-transparent">
            <div>
              <p className="font-bold text-sm text-on-surface">Contabilizar Dízimo</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Separar 10% desta entrada para dízimo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={countsForTithe}
                onChange={(e) => setCountsForTithe(e.target.checked)}
              />
              <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        )}

        {type === 'expense' && (
          <div className="space-y-4">
            <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">FREQUÊNCIA</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSubtype('variable')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs transition-all border-2 ${subtype === 'variable' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface-container-low text-on-surface-variant'}`}
              >
                Variável
              </button>
              <button
                type="button"
                onClick={() => setSubtype('semifixed')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs transition-all border-2 ${subtype === 'semifixed' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface-container-low text-on-surface-variant'}`}
              >
                Parcelado
              </button>
              <button
                type="button"
                onClick={() => setSubtype('fixed')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs transition-all border-2 ${subtype === 'fixed' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface-container-low text-on-surface-variant'}`}
              >
                Fixo
              </button>
            </div>
          </div>
        )}

          {/* Conditional Fields based on Frequência */}
          {type === 'expense' && subtype === 'fixed' && (
            <div className="relative">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">DIA DE VENCIMENTO</label>
              <div className="flex items-center bg-surface-container-low rounded-2xl px-4 py-1">
                <Calendar size={18} className="text-outline-variant mr-3" />
                <select 
                  className="w-full bg-transparent border-none p-0 py-3 font-bold text-sm appearance-none focus:ring-0"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d.toString().padStart(2, '0')}>{d.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'expense' && subtype === 'semifixed' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">QTD. PARCELAS</label>
                <input 
                  className="w-full bg-surface-container-low rounded-2xl border-none p-3 font-bold text-sm focus:ring-2 focus:ring-primary/20" 
                  type="number"
                  min="2"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">CARTÃO DE CRÉDITO</label>
                <select
                  className="w-full bg-surface-container-low rounded-2xl border-none p-3 font-bold text-sm focus:ring-2 focus:ring-primary/20"
                  value={creditCardId}
                  onChange={(e) => setCreditCardId(e.target.value)}
                  required
                >
                  {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {(subtype === 'variable' || subtype === 'fixed') && type === 'expense' && (
            <div className="space-y-4">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">PAGAMENTO (MÉTODO)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('debit')}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-2 ${paymentMethod === 'debit' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface-container-low text-on-surface-variant'}`}
                >
                  Débito / Pix
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-2 ${paymentMethod === 'credit' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface-container-low text-on-surface-variant'}`}
                >
                  Crédito
                </button>
              </div>
              {paymentMethod === 'credit' && (
                <div className="relative mt-2">
                  <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">SELECIONE O CARTÃO</label>
                  <select
                    className="w-full bg-surface-container-low rounded-2xl border-none p-3 font-bold text-sm focus:ring-2 focus:ring-primary/20"
                    value={creditCardId}
                    onChange={(e) => setCreditCardId(e.target.value)}
                    required
                  >
                    {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {type === 'expense' && (
            <div className="space-y-4">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">CATEGORIA</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full font-bold text-xs transition-all ${
                      category === cat 
                        ? 'bg-primary text-white shadow-md' 
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'expense' && hasSubcategories(category) && (
            <div className="relative animate-in fade-in slide-in-from-top-2">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">SUBCATEGORIA</label>
              <select 
                className="w-full bg-surface-container-low rounded-2xl border-none p-3 font-bold text-sm appearance-none focus:ring-2 focus:ring-primary/20"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              >
                {SUBCATEGORIES[category].map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'expense' && (
            <div className="space-y-4">
              <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">PRIORIDADE (URGÊNCIA)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency('planned')}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-2 ${urgency === 'planned' ? 'border-[#354900] bg-[#354900]/10 text-[#354900]' : 'border-transparent bg-surface-container-low text-on-surface-variant'}`}
                >
                  Planejado
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-2 ${urgency === 'urgent' ? 'border-error bg-error/10 text-error' : 'border-transparent bg-surface-container-low text-on-surface-variant'}`}
                >
                  Urgente / Imprevisto
                </button>
              </div>
            </div>
          )}

          <div className="pt-[100px] pb-10">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-4 rounded-full font-headline font-bold text-base shadow-[0_10px_25px_rgba(93,63,211,0.25)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Transação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTransactionModal;
