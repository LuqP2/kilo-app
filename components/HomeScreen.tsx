import React, { useState } from 'react';
import './HomeScreen.css';
import Badge from './Badge';
import logoUrl from '../src/assets/logo.svg';

type SearchMode = 'ingredients' | 'recipe';

interface HomeScreenProps {
  onCameraClick: () => void;
  onKitchenClick: () => void;
  onInputSubmit: (ingredients: string[], mode?: SearchMode) => void;
  onExit: () => void;
  isPro: boolean;
  remainingGenerations: number;
  onUpgradeClick: () => void;
  error?: string | null;
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
  onUpgradeClick,
  error
}) => {
  const [inputValue, setInputValue] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('ingredients');

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
      if (searchMode === 'recipe') {
        // Para busca por nome de receita, usar diretamente o valor do input
        onInputSubmit([inputValue.trim()], 'recipe');
        setInputValue('');
      } else {
        // Para busca por ingredientes, adicionar à lista
        if (inputValue.includes(',')) {
          const newIngredients = inputValue.split(',').map(i => i.trim()).filter(i => i);
          newIngredients.forEach(ingredient => handleAddIngredient(ingredient));
        } else {
          handleAddIngredient(inputValue.trim());
        }
        setInputValue('');
      }
    }
  };

  const handleSearchRecipes = () => {
    if (searchMode === 'recipe' && inputValue.trim()) {
      // Para busca por nome de receita, usar o valor do input diretamente
      onInputSubmit([inputValue.trim()], 'recipe');
    } else if (searchMode === 'ingredients' && ingredients.length > 0) {
      // Para busca por ingredientes, usar a lista de ingredientes
      onInputSubmit(ingredients, 'ingredients');
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


      {/* Conteúdo principal centralizado */}
      <div className="home-content">
        <h1 className="main-title">
          O que vamos<br />
          cozinhar hoje?
        </h1>
        
        <p className="subtitle">
          Digite ingredientes, o nome de um prato, ou fotografe o que tiver à mão.
        </p>

        {/* Seletor de modo de busca */}
        <div className="search-mode-selector">
          <button
            type="button"
            className={`mode-button ${searchMode === 'ingredients' ? 'active' : ''}`}
            onClick={() => setSearchMode('ingredients')}
          >
            Ingredientes
          </button>
          <button
            type="button"
            className={`mode-button ${searchMode === 'recipe' ? 'active' : ''}`}
            onClick={() => setSearchMode('recipe')}
          >
            Nome do Prato
          </button>
        </div>

        {/* Campo de busca com ícone da câmera */}
        <form onSubmit={handleInputSubmit} className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder={
              searchMode === 'recipe' 
                ? "Ex: Fricassê de frango, Lasanha bolonhesa..." 
                : ingredients.length > 0 
                  ? "Adicionar mais ingredientes..." 
                  : "Ex: arroz, frango, batata..."
            }
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
            <img 
              src={logoUrl}
              alt="Kilo Logo"
              className="logo-icon"
              style={{ 
                width: '22px', 
                height: '22px',
                filter: 'brightness(0) invert(1)' // Transforma em branco
              }}
            />
          </button>
        </form>

        {/* Lista de ingredientes adicionados - só para modo ingredientes */}
        {searchMode === 'ingredients' && ingredients.length > 0 && (
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

        {/* Botão de buscar para modo receita */}
        {searchMode === 'recipe' && inputValue.trim() && (
          <div className="recipe-search-section">
            <button 
              onClick={handleSearchRecipes}
              className="search-recipes-button"
            >
              🔍 Buscar Receita: "{inputValue.trim()}"
            </button>
          </div>
        )}

        {/* Sugestões de ingredientes comuns - só para modo ingredientes */}
        {searchMode === 'ingredients' && filteredSuggestions.length > 0 && (
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

        {/* Error Display */}
        {error && (
          <div className="error-message" style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            padding: '12px',
            margin: '16px 0',
            color: '#c33',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
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
