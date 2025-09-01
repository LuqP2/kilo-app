import React, { useState } from 'react';
import Badge from './Badge';

interface ManualIngredientInputProps {
  ingredients: string[];
  onAddIngredient: (ingredient: string) => void;
  onRemoveIngredient: (ingredient: string) => void;
  disabled?: boolean;
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

const ManualIngredientInput: React.FC<ManualIngredientInputProps> = ({ ingredients, onAddIngredient, onRemoveIngredient, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddIngredient(inputValue);
      setInputValue('');
    }
  };
  
  const handleSuggestionClick = (ingredient: string) => {
    onAddIngredient(ingredient);
  };

  // Ensure case-insensitivity when filtering
  const lowercasedIngredients = ingredients.map(i => i.toLowerCase());
  const filteredSuggestions = COMMON_INGREDIENTS.filter(
    (suggestion) => !lowercasedIngredients.includes(suggestion.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <label htmlFor="manual-ingredient-input" className="block text-center text-base font-medium text-slate-700 mb-2">
        Digite os ingredientes que tem (separados por vírgula)
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          id="manual-ingredient-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={disabled ? 'Limite diário de receitas atingido' : "Exemplo: resto de purê, arroz de ontem, sobra de frango"}
          disabled={disabled}
          className="flex-grow min-w-0 bg-white border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Adicionar
        </button>
      </form>

      <div className="mt-4 flex min-h-[44px] flex-wrap items-start justify-center gap-2" aria-live="polite">
        {ingredients.map((ingredient) => (
          <Badge
            key={ingredient}
            text={ingredient}
            onClick={() => onRemoveIngredient(ingredient)}
            removable={true}
          />
        ))}
      </div>

      {filteredSuggestions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-center text-sm text-slate-500 mb-3">Sugestões comuns:</p>
            <div className="flex flex-wrap justify-center gap-2">
                {filteredSuggestions.map((suggestion) => (
                    <Badge
                        key={suggestion}
                        text={suggestion}
                        variant="suggestion"
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={disabled}
                    />
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default ManualIngredientInput;