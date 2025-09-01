import React from 'react';

interface HeaderProps {
  onShowSaved: () => void;
  savedRecipesCount: number;
  onShowSettings: () => void;
  remainingGenerations: number;
  userPlan: 'free' | 'pro';
}

const Header: React.FC<HeaderProps> = ({ onShowSaved, savedRecipesCount, onShowSettings, remainingGenerations, userPlan }) => {
  return (
    <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
             <a href="/" aria-label="Kilo - Página Inicial">
              <img className="h-8 w-auto" src="/logo.svg" alt="Kilo Logo" />
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             {userPlan === 'free' && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full text-orange-700 bg-orange-100 border border-orange-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                    <span>{remainingGenerations} <span className="hidden lg:inline">gerações restantes</span></span>
                </div>
            )}
             {userPlan === 'pro' && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full text-green-700 bg-green-100 border border-green-200">
                    <span>Kilo PRO</span>
                </div>
            )}
            <button
              onClick={onShowSaved}
              className="relative inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md text-slate-600 bg-transparent hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3-5 3V4z" />
              </svg>
              <span className="hidden sm:inline">Minhas Receitas</span>
              {savedRecipesCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-orange-500 rounded-full">
                  {savedRecipesCount}
                </span>
              )}
            </button>
             <button
              onClick={onShowSettings}
              className="inline-flex items-center justify-center h-10 w-10 rounded-md text-slate-600 bg-transparent hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              aria-label="Abrir configurações"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
