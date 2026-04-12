import React from 'react';
import { Home, BarChart2, Clock, Settings } from 'lucide-react';
import type { Tab } from '../App';

const TABS: { id: Tab; Icon: React.FC<any>; label: string }[] = [
  { id: 'home',     Icon: Home,      label: 'Início'   },
  { id: 'analysis', Icon: BarChart2,  label: 'Análise'  },
  { id: 'history',  Icon: Clock,      label: 'Histórico'},
  { id: 'settings', Icon: Settings,   label: 'Ajustes'  },
];

const BottomNav = ({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) => (
  <nav className="bottom-nav">
    {TABS.map(({ id, Icon, label }) => {
      const isActive = activeTab === id;
      return (
        <button
          key={id}
          id={`nav-${id}`}
          onClick={() => onTabChange(id)}
          className={`nav-item${isActive ? ' active' : ''}`}
          aria-label={label}
        >
          <Icon
            size={24}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span>{label}</span>
        </button>
      );
    })}
  </nav>
);

export default BottomNav;
