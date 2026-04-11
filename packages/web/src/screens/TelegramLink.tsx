import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, ChevronRight, MessageCircle, Copy, CheckCheck } from 'lucide-react';

interface TelegramLinkProps {
  userId: string;
  onSkippedOrLinked: () => void;
}

const TelegramLink = ({ userId, onSkippedOrLinked }: TelegramLinkProps) => {
  const [linkCode, setLinkCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorDesc, setErrorDesc] = useState('');
  const [copied, setCopied] = useState(false);
  const pollingRef = React.useRef<any>(null);

  // Gera código randômico assim que o componente monta
  React.useEffect(() => {
    generateCode();
  }, [userId]);

  const generateCode = async () => {
    setLoading(true);
    setErrorDesc('');
    
    // 1. Busca primeiro para ver se já existe um link_code
    const { data: existingData } = await supabase
      .from('user_profiles')
      .select('link_code')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (existingData?.link_code) {
      setLinkCode(existingData.link_code);
      setLoading(false);
      return;
    }

    // 2. Se não existir, gera um novo e faz upsert
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setLinkCode(code);

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, link_code: code }, { onConflict: 'user_id' });

    if (error) {
      console.error('Falha real no upsert do gerador:', error);
    }
    setLoading(false);
  };

  const startPolling = () => {
    console.log('[POLLING] userId sendo usado:', userId);
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    setChecking(true);
    setErrorDesc('');
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('telegram_id')
          .eq('user_id', userId)
          .maybeSingle();
        
        console.log('[POLLING] data retornado:', JSON.stringify(data), 'error:', error);
        
        if (data?.telegram_id) {
          clearInterval(interval);
          pollingRef.current = null;
          setChecking(false);
          onSkippedOrLinked();
        } else if (attempts >= 60) {
          clearInterval(interval);
          pollingRef.current = null;
          setChecking(false);
          setErrorDesc('O tempo se esgotou. Tente novamente.');
        }
      } catch (e) {
        console.log('polling error:', e);
      }
    }, 3000);
    
    pollingRef.current = interval;
  };

  const handleCopy = () => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setChecking(false);
    startPolling();
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
              <div 
                onClick={handleCopy}
                className="flex items-center justify-center gap-3 mb-6 cursor-pointer group hover:opacity-80 transition-opacity"
              >
                <p className="font-display text-[48px] tracking-widest text-[var(--on-surface)]">
                  {linkCode}
                </p>
                <div className="w-8 h-8 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center text-[var(--primary)]">
                  {copied ? <CheckCheck size={18} /> : <Copy size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />}
                </div>
              </div>
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
            onClick={startPolling}
            disabled={checking || loading}
            className="w-full flex items-center justify-between bg-[var(--primary)] text-[var(--on-primary)] py-4 px-6 rounded-[3rem] font-bold text-[17px] transition-transform active:scale-[0.98] disabled:opacity-70 shadow-sm"
          >
            <span>{checking ? 'Verificando...' : 'Já enviei o código'}</span>
            <ChevronRight size={22} />
          </button>

          {checking && (
            <button
              onClick={handleRetry}
              className="w-full mt-3 text-sm font-bold text-[var(--primary)] opacity-60 hover:opacity-100 transition-opacity py-2"
            >
              Tentar novamente
            </button>
          )}

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
