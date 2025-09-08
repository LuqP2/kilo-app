import React, { useState } from 'react';
import './HomeScreen.css';
import Badge from './Badge';

interface HomeScreenProps {
  onCameraClick: () => void;
  onKitchenClick: () => void;
  onInputSubmit: (ingredients: string[]) => void;
  onExit: () => void;
  isPro: boolean;
  remainingGenerations: number;
  onUpgradeClick: () => void;
}

const COMMON_INGREDIENTS = [
  'Arroz',
  'Feijão',
  'Macarrão',
  'Batata',
  'Cebola',
  'Alho',
  'Tomate',
  'Ovos',
  'Leite',
  'Pão',
  'Frango',
  'Carne moída',
  'Queijo',
  'Presunto',
  'Azeite',
  'Sal',
];

const HomeScreen: React.FC<HomeScreenProps> = ({
  onCameraClick,
  onKitchenClick,
  onInputSubmit,
  onExit,
  isPro,
  remainingGenerations,
  onUpgradeClick
}) => {
  const [inputValue, setInputValue] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);

  const handleAddIngredient = (ingredient: string) => {
    const trimmedIngredient = ingredient.trim();
    if (trimmedIngredient && !ingredients.some(i => i.toLowerCase() === trimmedIngredient.toLowerCase())) {
      setIngredients([...ingredients, trimmedIngredient]);
    }
  };

  const handleRemoveIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Se contém vírgulas, dividir em múltiplos ingredientes
      if (inputValue.includes(',')) {
        const newIngredients = inputValue.split(',').map(i => i.trim()).filter(i => i);
        newIngredients.forEach(ingredient => handleAddIngredient(ingredient));
      } else {
        handleAddIngredient(inputValue.trim());
      }
      setInputValue('');
    }
  };

  const handleSearchRecipes = () => {
    if (ingredients.length > 0) {
      onInputSubmit(ingredients);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit(e);
    }
  };

  const handleSuggestionClick = (ingredient: string) => {
    handleAddIngredient(ingredient);
  };

  // Filtrar sugestões que já foram adicionadas
  const lowercasedIngredients = ingredients.map(i => i.toLowerCase());
  const filteredSuggestions = COMMON_INGREDIENTS.filter(
    (suggestion) => !lowercasedIngredients.includes(suggestion.toLowerCase())
  );

  return (
    <div className="home-screen">
      {/* Header */}
      <div className="home-header">
        <div className="logo">kilo</div>
        <div className="header-right">
          {isPro ? (
            <span className="plan-badge pro">Kilo Pro</span>
          ) : (
            <button 
              className="plan-badge free" 
              onClick={onUpgradeClick}
              title="Clique para fazer upgrade"
            >
              {remainingGenerations} gerações restantes
            </button>
          )}
        </div>
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
        <form onSubmit={handleInputSubmit} className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder={ingredients.length > 0 ? "Adicionar mais ingredientes..." : "Ex: Fricassê de frango, arroz, batata"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            type="button" 
            className="camera-button"
            onClick={onCameraClick}
            title="Fotografar ingredientes"
          >
            <svg className="camera-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 2l1.5 1.5H15c1.1 0 2 .9 2 2v13c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5.5c0-1.1.9-2 2-2h4.5L9 2zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
            </svg>
          </button>
        </form>

        {/* Lista de ingredientes adicionados */}
        {ingredients.length > 0 && (
          <div className="ingredients-section">
            <p className="ingredients-label">Ingredientes selecionados:</p>
            <div className="ingredients-list">
              {ingredients.map((ingredient) => (
                <Badge
                  key={ingredient}
                  text={ingredient}
                  onClick={() => handleRemoveIngredient(ingredient)}
                  removable={true}
                />
              ))}
            </div>
            
            {/* Botão de buscar receitas */}
            <button 
              onClick={handleSearchRecipes}
              className="search-recipes-button"
            >
              🔍 Buscar Receitas ({ingredients.length} {ingredients.length === 1 ? 'ingrediente' : 'ingredientes'})
            </button>
          </div>
        )}

        {/* Sugestões de ingredientes comuns */}
        {filteredSuggestions.length > 0 && (
          <div className="suggestions-section">
            <p className="suggestions-label">
              {ingredients.length === 0 ? "Ou escolha alguns ingredientes:" : "Sugestões:"}
            </p>
            <div className="suggestions-list">
              {filteredSuggestions.slice(0, ingredients.length === 0 ? 12 : 6).map((suggestion) => (
                <Badge
                  key={suggestion}
                  text={suggestion}
                  variant="suggestion"
                  onClick={() => handleSuggestionClick(suggestion)}
                />
              ))}
            </div>
          </div>
        )}

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
