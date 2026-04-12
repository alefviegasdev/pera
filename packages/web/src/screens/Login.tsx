import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LockOpen } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://pera-web-seven.vercel.app'
      }
    });
    if (error) {
      console.error('Erro no login:', error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface overflow-hidden">
      <main className="relative min-h-screen flex flex-col md:flex-row">
        
        {/* Left Side: Editorial Cover (Desktop only) */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary items-center justify-center">
          <div 
            className="absolute inset-0 z-0 opacity-40 bg-cover bg-center" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1634733988138-bf2c3a2a13fa?q=80&w=2070&auto=format&fit=crop')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary to-primary-dim mix-blend-multiply" />
          
          <div className="relative z-10 p-16 flex flex-col gap-8 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-tertiary-container flex items-center justify-center text-primary">
                 <span className="text-4xl">🍐</span>
              </div>
              <span className="font-headline font-extrabold text-4xl text-on-primary tracking-tight">Pera</span>
            </div>
            <h1 className="font-headline text-6xl font-extrabold text-on-primary leading-[1.1] tracking-tighter">
              O curador da sua <span className="text-tertiary-container">liberdade</span> financeira.
            </h1>
            <p className="text-on-primary/80 text-xl font-body leading-relaxed max-w-md">
              Transformamos dados complexos em uma experiência editorial sofisticada para o seu patrimônio.
            </p>
          </div>

          <div className="absolute top-8 left-8 z-50 pointer-events-none">
            <div className="h-32 w-[1px] bg-gradient-to-b from-tertiary-container to-transparent opacity-30" />
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-surface">
          <div className="w-full max-w-md flex flex-col gap-12">
            
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="md:hidden flex items-center gap-2 mb-4">
                <span className="text-3xl">🍐</span>
                <span className="font-headline font-extrabold text-2xl text-primary tracking-tight">Pera</span>
              </div>
              <h2 className="font-headline text-4xl font-bold text-on-surface tracking-tight text-center md:text-left">Bem-vindo</h2>
              <p className="text-on-surface-variant font-body text-lg text-center md:text-left">
                Acesse sua conta para gerenciar seu capital com clareza e propósito.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-16 flex items-center justify-center gap-4 bg-white text-on-surface font-semibold text-lg rounded-[1.5rem] shadow-sm hover:bg-surface-container-low transition-all duration-300 transform active:scale-95 group border border-surface-container"
              >
                {!loading && (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                )}
                {loading ? 'Redirecionando...' : 'Continuar com Google'}
              </button>
              <p className="text-on-surface-variant/70 text-[11px] font-bold uppercase tracking-widest text-center mt-2">
                Conexão rápida e segura via Google
              </p>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-outline-variant opacity-20"></div>
              <span className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.3em]">Segurança</span>
              <div className="h-[1px] flex-1 bg-outline-variant opacity-20"></div>
            </div>

            <div className="bg-surface-container-low p-8 rounded-[2rem] flex flex-col gap-4 border border-surface-container">
              <div className="flex items-center gap-3 text-primary">
                <LockOpen size={20} />
                <span className="font-black font-headline text-sm uppercase tracking-wider">Privacidade Garantida</span>
              </div>
              <p className="text-on-surface-variant leading-relaxed text-xs font-medium">
                Sua privacidade é nossa prioridade. Não compartilhamos seus dados financeiros. Utilizamos criptografia de ponta a ponta para proteger seu patrimônio.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 justify-center md:justify-start items-center">
              <a className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Termos de Uso</a>
              <div className="hidden md:block w-1 h-1 rounded-full bg-outline-variant opacity-40"></div>
              <a className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Política de Dados</a>
              <div className="hidden md:block w-1 h-1 rounded-full bg-outline-variant opacity-40"></div>
              <a className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Ajuda</a>
            </div>

          </div>
        </div>

        {/* Floating background text (Desktop only) */}
        <div className="fixed bottom-0 right-0 p-12 pointer-events-none opacity-[0.03] select-none hidden md:block">
          <span className="font-headline font-extrabold text-[12vw] leading-none tracking-tighter">FISCAL</span>
        </div>

      </main>
    </div>
  );
};

export default Login;
