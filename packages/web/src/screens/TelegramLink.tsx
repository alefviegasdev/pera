import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, CheckCircle2, ChevronRight, MessageCircle, Zap, ShieldCheck } from 'lucide-react';

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
  const hasGenerated = React.useRef(false);

  React.useEffect(() => {
    if (hasGenerated.current) return;
    hasGenerated.current = true;
    generateCode();
  }, [userId]);

  const generateCode = async () => {
    setLoading(true);
    setErrorDesc('');
    
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

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setLinkCode(code);

    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, link_code: code }, { onConflict: 'user_id' });

    if (error) console.error('Falha no vincular:', error);
    setLoading(false);
  };

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    setChecking(true);
    setErrorDesc('');
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('telegram_id')
          .eq('user_id', userId)
          .maybeSingle();
        
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
      } catch (e) { console.log('polling error:', e); }
    }, 3000);
    
    pollingRef.current = interval;
  };

  const handleCopy = () => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden relative">
      <div className="w-full max-w-lg flex flex-col gap-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
             <span className="text-3xl text-white">🍐</span>
          </div>
          <div className="space-y-2">
            <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tighter leading-none">
              Conecte sua Experiência
            </h1>
            <p className="font-body text-on-surface-variant text-lg font-medium opacity-70">
              Vincule seu Telegram para transações instantâneas.
            </p>
          </div>
        </div>

        {/* Code Card */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-float border border-surface-container relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="relative z-10 flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Seu código de vínculo</p>
            
            {loading ? (
              <div className="h-20 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <div 
                onClick={handleCopy}
                className="flex items-center gap-4 cursor-pointer group hover:scale-[1.02] transition-transform"
              >
                <div className="font-display text-5xl sm:text-6xl font-black tracking-[0.2em] text-on-surface">
                  {linkCode}
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${copied ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-primary group-hover:bg-primary group-hover:text-white'}`}>
                  {copied ? <CheckCircle2 size={24} /> : <Copy size={20} />}
                </div>
              </div>
            )}
            {copied && <p className="text-tertiary font-bold text-xs mt-4 animate-pulse">Código copiado!</p>}
          </div>
        </div>

        {/* Instruction Steps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/50 px-2">Como vincular</h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: <MessageCircle size={20} />, text: 'Abra o @PeraFin_bot no Telegram', color: 'bg-primary/10' },
              { icon: <Zap size={20} />, text: 'Envie os 6 dígitos mostrados acima', color: 'bg-secondary-container/20' },
              { icon: <ShieldCheck size={20} />, text: 'Sincronização instantânea e segura', color: 'bg-tertiary-container/20' }
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-5 p-5 bg-surface-container-low border border-surface-container rounded-[1.5rem] hover:bg-white transition-colors">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${step.color}`}>
                  {step.icon}
                </div>
                <p className="text-sm font-bold text-on-surface-variant leading-tight">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Status */}
        <div className="flex flex-col gap-4 mt-4">
          <button
            onClick={startPolling}
            disabled={checking || loading}
            className="w-full h-16 flex items-center justify-between bg-primary text-on-primary px-8 rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-50"
          >
            <span>{checking ? 'Verificando vincúlo...' : 'Já enviei o código'}</span>
            <ChevronRight size={22} />
          </button>
          
          {checking && (
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <p className="text-xs font-bold text-primary italic">Estamos aguardando o seu sinal...</p>
            </div>
          )}

          {errorDesc ? (
            <p className="text-error font-bold text-xs text-center p-3 bg-error/5 border border-error/10 rounded-xl">{errorDesc}</p>
          ) : (
            <button 
              className="text-primary font-black text-xs uppercase tracking-widest hover:opacity-70 transition-opacity py-4"
              onClick={onSkippedOrLinked}
            >
              Fazer isso mais tarde
            </button>
          )}
        </div>

      </div>

      {/* Background Decorative Text */}
      <div className="fixed bottom-0 right-0 p-12 pointer-events-none opacity-[0.03] select-none hidden sm:block">
        <span className="font-headline font-extrabold text-[12vw] leading-none tracking-tighter">TELEGRAM</span>
      </div>
    </div>
  );
};

export default TelegramLink;
