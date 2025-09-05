import React from 'react';
import { Home, Heart, Calendar, Settings } from 'lucide-react';

interface BottomNavigationProps {
  currentView: 'home' | 'recipes' | 'planning' | 'settings';
  onNavigate: (view: 'home' | 'recipes' | 'planning' | 'settings') => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: <Home size={24} />
    },
    {
      id: 'recipes' as const,
      label: 'Receitas Salvas',
      icon: <Heart size={24} />
    },
    {
      id: 'planning' as const,
      label: 'Planejamento',
      icon: <Calendar size={24} />
    },
    {
      id: 'settings' as const,
      label: 'Configurações',
      icon: <Settings size={24} />
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-[#FFFFFF] border-t border-[#E5E7EB] border-t-[1px] h-16 z-50 shadow-sm md:hidden">
      <div className="flex items-center justify-around h-full w-full px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
              currentView === item.id
                ? 'text-[#FF7043] font-bold'
                : 'text-[#6B7280] font-normal hover:text-[#FF7043]'
            }`}
          >
            <div className={`mb-0.5 flex items-center justify-center ${currentView === item.id ? 'text-[#FF7043]' : 'text-[#6B7280]'} transition-colors duration-200`}>
              {React.cloneElement(item.icon, { size: 24, color: currentView === item.id ? '#FF7043' : '#6B7280' })}
            </div>
            <span className={`text-xs mt-1 transition-colors duration-200 ${currentView === item.id ? 'text-[#FF7043] font-bold' : 'text-[#6B7280] font-normal'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
