import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, ChevronRight, MessageCircle } from 'lucide-react';

interface TelegramLinkProps {
  userId: string;
  onSkippedOrLinked: () => void;
}

const TelegramLink = ({ userId, onSkippedOrLinked }: TelegramLinkProps) => {
  const [linkCode, setLinkCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorDesc, setErrorDesc] = useState('');

  // Gera código randômico assim que o componente monta
  React.useEffect(() => {
    generateCode();
  }, [userId]);

  const generateCode = async () => {
    setLoading(true);
    setErrorDesc('');
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setLinkCode(code);

    console.log('user_id:', userId, 'link_code:', code);

    // Salva no banco "user_profiles"
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, link_code: code }, { onConflict: 'user_id' });

    console.log('resultado upsert:', data, error);

    if (error) {
      console.error('Falha real no upsert do gerador:', error);
      // Evitamos assustar o usuário na inicialização se for RLS, logando internamente até ele configurar
    }
    setLoading(false);
  };

  const handleCheckLink = async () => {
    setChecking(true);
    setErrorDesc('');
    
    // Verifica se "telegram_id" já não é mais nulo
    const { data, error } = await supabase
      .from('user_profiles')
      .select('telegram_id')
      .eq('user_id', userId)
      .single();

    setChecking(false);

    if (error) {
      console.error(error);
      setErrorDesc('Erro ao verificar o status de vínculo.');
      return;
    }

    if (data?.telegram_id) {
      onSkippedOrLinked();
    } else {
      setErrorDesc('O bot ainda não recebeu seu código. Envie e tente novamente.');
    }
  };

  return (
    <div className="screen flex flex-col justify-center min-h-[100dvh] bg-[var(--surface-container-low)] p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        
        <h1 className="font-display text-[2.2rem] leading-tight mb-4 text-[var(--on-surface)]">
          Conecte seu Telegram
        </h1>
        <p className="font-title text-[15px] sm:text-base text-[var(--on-surface-variant)] mb-8 font-medium">
          Vincule sua conta para receber alertas de gastos e cadastrar transações via chat de forma instantânea.
        </p>

        <div className="card-container bg-[var(--surface-container-lowest)] p-6 rounded-[2rem] shadow-float relative overflow-hidden">
          {/* Glass & Gradient Background Effect */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] opacity-10 pointer-events-none" />

          {loading ? (
             <div className="h-24 flex items-center justify-center">
                <div className="animate-pulse flex space-x-2">
                   <div className="w-3 h-3 bg-[var(--primary)] rounded-full"></div>
                   <div className="w-3 h-3 bg-[var(--primary)] rounded-full delay-75"></div>
                   <div className="w-3 h-3 bg-[var(--primary)] rounded-full delay-150"></div>
                </div>
             </div>
          ) : (
            <>
              <p className="text-center text-sm font-bold text-[var(--primary)] uppercase tracking-wide mb-2">Seu código de vínculo</p>
              <p className="text-center font-display text-[48px] tracking-widest text-[var(--on-surface)] mb-6">
                {linkCode}
              </p>
            </>
          )}

          <div className="flex flex-col gap-3 text-sm font-medium text-[var(--on-surface-variant)] mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] flex items-center justify-center font-bold text-xs flex-shrink-0">1</div>
              <p>Abra o <strong>@PeraFin_bot</strong> no Telegram.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] flex items-center justify-center font-bold text-xs flex-shrink-0">2</div>
              <p>Envie exatamente os 6 dígitos acima como mensagem.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] flex items-center justify-center font-bold text-xs flex-shrink-0">3</div>
              <p>Nós faremos a mágica da sincronização em segundos.</p>
            </div>
          </div>

          <button
            onClick={handleCheckLink}
            disabled={checking || loading}
            className="w-full flex items-center justify-between bg-[var(--primary)] text-[var(--on-primary)] py-4 px-6 rounded-[3rem] font-bold text-[17px] transition-transform active:scale-[0.98] disabled:opacity-70 shadow-sm"
          >
            <span>{checking ? 'Verificando...' : 'Já enviei o código'}</span>
            <ChevronRight size={22} />
          </button>

          {errorDesc && (
            <p className="mt-4 text-center text-sm text-[var(--error)] font-bold">{errorDesc}</p>
          )}
        </div>

        <button 
          className="mt-8 mx-auto self-center text-sm font-bold text-[var(--primary)] tracking-wide bg-transparent transition-transform active:scale-[0.98]"
          onClick={onSkippedOrLinked}
        >
          Fazer isso depois
        </button>

      </div>
    </div>
  );
};

export default TelegramLink;
