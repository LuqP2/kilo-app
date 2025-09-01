import React from 'react';
import { Recipe } from '../types';

interface SavedRecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedRecipes: Recipe[];
  onToggleSave: (recipe: Recipe) => void;
  onViewRecipe: (recipe: Recipe) => void;
}

const SavedRecipesModal: React.FC<SavedRecipesModalProps> = ({ 
  isOpen, 
  onClose, 
  savedRecipes, 
  onToggleSave, 
  onViewRecipe,
}) => {

  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-0 sm:p-4 transition-opacity"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:w-full sm:max-w-2xl sm:h-auto sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-slate-900">Minhas Receitas Salvas</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {savedRecipes.length > 0 ? (
            <ul className="space-y-4">
              {savedRecipes.map(recipe => (
                <li key={recipe.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-grow">
                        <h4 className="font-bold text-slate-800">{recipe.recipeName}</h4>
                        <p className="mt-1 text-slate-600 line-clamp-2">{recipe.description}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => onViewRecipe(recipe)}
                            className="text-sm font-semibold text-orange-600 hover:underline"
                          >
                            Ver Receita
                          </button>
                           <span className="text-slate-300">|</span>
                           <button
                            onClick={() => onViewRecipe(recipe)}
                            className="text-sm font-semibold text-slate-600 hover:underline"
                           >
                            Editar
                           </button>
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleSave(recipe)}
                        className="flex-shrink-0 text-slate-400 hover:text-orange-500 transition-colors mt-1"
                        aria-label="Remover dos favoritos"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3-5 3V4z" className="text-orange-500" />
                        </svg>
                      </button>
                    </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h4 className="mt-4 text-lg font-semibold text-slate-700">Nenhuma receita salva</h4>
              <p className="mt-1 text-slate-500">Suas receitas favoritas aparecerão aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedRecipesModal;
