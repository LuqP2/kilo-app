import React from 'react';
import { Home, Heart, Calendar, Settings } from 'lucide-react';
import './BottomNavigation.css';

interface BottomNavigationProps {
  currentView: 'home' | 'recipes' | 'planning' | 'settings';
  onNavigate: (view: 'home' | 'recipes' | 'planning' | 'settings') => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: <Home size={20} strokeWidth={1.5} />
    },
    {
      id: 'recipes' as const,
      label: 'Receitas Salvas',
      icon: <Heart size={20} strokeWidth={1.5} />
    },
    {
      id: 'planning' as const,
      label: 'Planejamento',
      icon: <Calendar size={20} strokeWidth={1.5} />
    },
    {
      id: 'settings' as const,
      label: 'Configurações',
      icon: <Settings size={20} strokeWidth={1.5} />
    }
  ];

  return (
    <nav className="bottom-navigation">
      <div className="bottom-nav-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`bottom-nav-item ${currentView === item.id ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon">
              {React.cloneElement(item.icon, { 
                size: 20, 
                color: currentView === item.id ? '#333333' : '#666666',
                strokeWidth: currentView === item.id ? 2 : 1.5
              })}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;
