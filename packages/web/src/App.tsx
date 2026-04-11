import React, { useState, useEffect } from 'react';
import Home from './screens/Home';
import Analysis from './screens/Analysis';
import History from './screens/History';
import Settings from './screens/Settings';
import BottomNav from './components/BottomNav';

export type Tab = 'home' | 'analysis' | 'history' | 'settings';

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem('pera_user_id');
    return (saved && saved !== 'default_user') ? saved : '5637235532';
  });

  useEffect(() => {
    localStorage.setItem('pera_user_id', userId);
  }, [userId]);

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
