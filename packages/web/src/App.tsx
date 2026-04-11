import React, { useState, useEffect } from 'react';
import Home from './screens/Home';
import Analysis from './screens/Analysis';
import History from './screens/History';
import Settings from './screens/Settings';
import BottomNav from './components/BottomNav';
import { supabase } from './lib/supabase';
import Login from './screens/Login';
import TelegramLink from './screens/TelegramLink';

export type Tab = 'home' | 'analysis' | 'history' | 'settings';

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsTelegramLink, setNeedsTelegramLink] = useState(false);

  useEffect(() => {
    // 1. Garante inicialização usando getUser() real (bypass de cache de session)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.id) {
        setUserId(user.id);
        await checkTelegramLink(user.id);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });
    
    // Escuta mudanças de estado na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserId(session.user.id);
          await checkTelegramLink(session.user.id);
        } else {
          setUserId(null);
          setNeedsTelegramLink(false);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkTelegramLink = async (uid: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('telegram_id')
      .eq('user_id', uid)
      .maybeSingle();

    if (!data || !data.telegram_id) {
       setNeedsTelegramLink(true);
    } else {
       setNeedsTelegramLink(false);
    }
    setLoading(false);
  };

  if (loading) {
     return <div className="screen flex items-center justify-center min-h-[100dvh]">Carregando...</div>;
  }

  if (!userId) {
     return <Login />;
  }

  if (needsTelegramLink) {
     return <TelegramLink userId={userId} onSkippedOrLinked={() => setNeedsTelegramLink(false)} />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':     return <Home userId={userId} />;
      case 'analysis': return <Analysis userId={userId} />;
      case 'history':  return <History userId={userId} />;
      case 'settings': return <Settings userId={userId} onUserChange={setUserId} />;
      default:         return <Home userId={userId} />;
    }
  };

  return (
    <div className="app-shell">
      {renderScreen()}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
