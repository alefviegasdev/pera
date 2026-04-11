import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight } from 'lucide-react';

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
    <div className="screen flex flex-col justify-center min-h-[100dvh] bg-[var(--surface)] p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h1 className="font-display text-4xl leading-[1.1] mb-4 text-[var(--on-surface)]">
          O curador da sua liberdade financeira.
        </h1>
        <p className="font-title text-base text-[var(--on-surface-variant)] mb-10 leading-relaxed font-medium">
          Transformamos dados complexos em uma experiência editorial sofisticada para o seu patrimônio.
        </p>

        <div className="card-container bg-[var(--surface-container-lowest)] p-6 rounded-[2rem] shadow-float">
          <h2 className="font-headline text-2xl mb-2 text-[var(--on-surface)]">Bem-vindo de volta</h2>
          <p className="text-sm text-[var(--on-surface-variant)] mb-6 font-medium">
            Acesse sua conta para gerenciar seu capital com clareza e propósito.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-between bg-[var(--primary)] text-[var(--on-primary)] py-4 px-6 rounded-[3rem] font-bold text-lg transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <span>{loading ? 'Redirecionando...' : 'Entrar com Google'}</span>
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      <div className="text-center mt-8 pb-4">
        <p className="text-xs text-[var(--on-surface-variant)] font-semibold mb-2">
          Sua privacidade é nossa prioridade. Não compartilhamos seus dados financeiros. Utilizamos criptografia de ponta a ponta para proteger seu patrimônio.
        </p>
        <div className="flex justify-center gap-4 text-xs font-bold text-[var(--primary)] text-opacity-80">
          <a href="#">Termos de Uso</a>
          <a href="#">Política de Dados</a>
          <a href="#">Ajuda</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
