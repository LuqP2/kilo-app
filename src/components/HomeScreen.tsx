import React, { useState } from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onCameraClick: () => void;
  onKitchenClick: () => void;
  onInputSubmit: (input: string) => void;
  onExit: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onCameraClick,
  onKitchenClick,
  onInputSubmit,
  onExit
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onInputSubmit(inputValue.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="home-screen">
      {/* Header */}
      <div className="home-header">
        <div className="logo">kilo</div>
        <button className="exit-button" onClick={onExit}>
          Sair
        </button>
      </div>

      {/* Conteúdo principal centralizado */}
      <div className="home-content">
        <h1 className="main-title">
          O que vamos<br />
          cozinhar hoje?
        </h1>
        
        <p className="subtitle">
          Digite ingredientes, o nome de um prato, ou fotografe o que tiver à mão.
        </p>

        {/* Campo de busca com ícone da câmera */}
        <form onSubmit={handleSubmit} className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Ex: Fricassê de frango"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            type="button" 
            className="camera-button"
            onClick={onCameraClick}
          >
            <svg className="camera-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.2l3.536-3.536 1.414 1.414L12 18.028l-4.95-4.95 1.414-1.414L12 15.2zm0-6.4l-3.536 3.536-1.414-1.414L12 5.972l4.95 4.95-1.414 1.414L12 8.8z"/>
              <path d="M9 2l1.5 1.5H15c1.1 0 2 .9 2 2v13c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5.5c0-1.1.9-2 2-2h4.5L9 2zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
            </svg>
          </button>
        </form>

        {/* Card "Minha Cozinha" */}
        <div className="kitchen-card" onClick={onKitchenClick}>
          <div className="kitchen-card-header">
            <svg className="kitchen-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <span className="kitchen-title">Minha Cozinha</span>
          </div>
          <p className="kitchen-description">
            Configure seus equipamentos para receitas precisas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
