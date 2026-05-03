import React from 'react';
import { motion } from 'framer-motion';
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
    <nav className="relative flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full py-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/30 px-2.5">
      {TABS.map(({ id, icon, label }) => {
        const isActive = activeTab === id;
        
        return (
          <button
            key={id}
            onClick={() => onTabChange(id as Tab)}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300 z-10 ${isActive ? 'text-white' : 'text-on-surface-variant/40 hover:text-primary'}`}
            aria-label={label}
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 bg-primary rounded-full shadow-md shadow-primary/20"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8
                }}
              />
            )}
            <span 
              className="material-symbols-outlined text-[22px] relative z-20" 
              style={{ fontVariationSettings: isActive ? '"FILL" 1' : '"FILL" 0' }}
            >
              {icon}
            </span>
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
