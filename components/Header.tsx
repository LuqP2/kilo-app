import React from 'react';
import { useAuth } from '../AuthContext';
import logoUrl from '../src/assets/logo.svg';

interface HeaderProps {
  hasGenerationsLeft: boolean;
  generationsLeft: number;
  onShowSettings: () => void;
  currentView: 'home' | 'recipes' | 'planning' | 'settings';
  onNavigate: (view: 'home' | 'recipes' | 'planning' | 'settings') => void;
}

const Header: React.FC<HeaderProps> = ({ 
  hasGenerationsLeft, 
  generationsLeft, 
  onShowSettings, 
  currentView, 
  onNavigate 
}) => {
  const { user } = useAuth();

  return (
    <header className="w-full bg-white/80 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-200">
      {/* Container centralizado com max-width */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Grupo da Esquerda */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2"
            >
              <img src={logoUrl} alt="Kilo Logo" className="h-8 w-8" />
              <span className="font-semibold text-xl text-slate-900">kilo</span>
            </button>

            {/* Links de Navegação (visíveis apenas em desktop) */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate('home')}
                className={`text-sm font-medium ${
                  currentView === 'home' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('recipes')}
                className={`text-sm font-medium ${
                  currentView === 'recipes' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Receitas Salvas
              </button>
              <button
                onClick={() => onNavigate('planning')}
                className={`text-sm font-medium ${
                  currentView === 'planning' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Planejamento
              </button>
              <button
                onClick={onShowSettings}
                className={`text-sm font-medium ${
                  currentView === 'settings' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Configurações
              </button>
            </nav>
          </div>

          {/* Grupo da Direita */}
          <div className="flex items-center gap-4">
            {/* Contador de Gerações */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 border border-orange-200 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-orange-700">
                {generationsLeft > 0 ? (
                  <>
                    <span className="font-semibold">{generationsLeft}</span>
                    <span className="hidden lg:inline"> gerações restantes</span>
                  </>
                ) : (
                  'Limite diário atingido'
                )}
              </span>
            </div>

            {/* Perfil do Usuário */}
            {user ? (
              <button
                onClick={onShowSettings}
                className="flex items-center"
                aria-label="Configurações do perfil"
              >
                <img
                  src={user.photoURL || '/default-avatar.png'}
                  alt="Perfil"
                  className="h-8 w-8 rounded-full ring-2 ring-white hover:ring-orange-200 transition-colors"
                />
              </button>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
