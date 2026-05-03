import React from 'react';
import type { Tab } from '../App';

const TABS: { id: string; icon: string; label: string }[] = [
  { id: 'home',     icon: 'home',         label: 'Início'   },
  { id: 'cards',    icon: 'credit_card',  label: 'Cartões'  },
  { id: 'analysis', icon: 'analytics',    label: 'Análise'  },
  { id: 'history',  icon: 'history',      label: 'Histórico'},
  { id: 'settings', icon: 'settings',     label: 'Ajustes'  },
];

const BottomNav = ({
  activeTab,
  onTabChange,
  hidden = false,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  hidden?: boolean;
}) => (
  <div className={`fixed left-6 right-6 z-40 bottom-8 flex justify-center items-center gap-3 ${hidden ? 'hidden' : ''}`}>
    <nav className="flex items-center gap-1 bg-white/80 backdrop-blur-3xl rounded-full py-2 shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-white/40 px-2.5">
      {TABS.map(({ id, icon, label }) => {
        const isActive = activeTab === id;
        
        if (isActive) {
          return (
            <button
              key={id}
              onClick={() => onTabChange(id as Tab)}
              className="flex items-center justify-center bg-primary text-white rounded-full w-10 h-10 transition-all duration-300 shadow-md shadow-primary/20"
              aria-label={label}
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
            </button>
          );
        }

        return (
          <button
            key={id}
            onClick={() => onTabChange(id as Tab)}
            className="flex items-center justify-center text-on-surface-variant/40 w-10 h-10 hover:text-primary transition-colors"
            aria-label={label}
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </button>
        );
      })}
    </nav>
    <button className="w-14 h-14 bg-[#161618] rounded-full flex items-center justify-center shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-transform">
      <span className="material-symbols-outlined text-primary text-3xl font-bold">add</span>
    </button>
  </div>
);

export default BottomNav;
