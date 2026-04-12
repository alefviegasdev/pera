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
  const [userMetadata, setUserMetadata] = useState<{ name?: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsTelegramLink, setNeedsTelegramLink] = useState(false);

  useEffect(() => {
    const authTimeout = setTimeout(() => {
      setLoading(false);
      console.warn('Auth check timed out');
    }, 1000);

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      clearTimeout(authTimeout);
      if (user?.id) {
        setUserId(user.id);
        setUserMetadata({
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture
        });
        await checkTelegramLink(user.id);
      } else {
        setUserId(null);
        setUserMetadata(null);
        setLoading(false);
      }
    }).catch(() => {
      // Se getUser falhar (ex: clock skew), tenta via getSession como fallback
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        clearTimeout(authTimeout);
        if (session?.user?.id) {
          setUserId(session.user.id);
          setUserMetadata({
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
          });
          await checkTelegramLink(session.user.id);
        } else {
          setUserId(null);
          setUserMetadata(null);
          setLoading(false);
        }
      }).catch(() => {
        clearTimeout(authTimeout);
        setUserId(null);
        setLoading(false);
      });
    });
    
    // Escuta mudanças de estado na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserId(session.user.id);
          setUserMetadata({
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
          });
          await checkTelegramLink(session.user.id);
        } else {
          setUserId(null);
          setUserMetadata(null);
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
      case 'home':     return <Home userId={userId!} userMetadata={userMetadata} onTabChange={setActiveTab} />;
      case 'analysis': return <Analysis userId={userId!} />;
      case 'history':  return <History userId={userId!} />;
      case 'settings': return <Settings userId={userId!} onUserChange={(id) => { setUserId(id); }} userMetadata={userMetadata} />;
      default:         return <Home userId={userId!} userMetadata={userMetadata} onTabChange={setActiveTab} />;
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
