import React from 'react';
import { Recipe } from '../types';

interface RecipeDetailViewProps {
  recipe: Recipe | null;
  onBack: () => void;
}

const RecipeDetailView: React.FC<RecipeDetailViewProps> = ({ recipe, onBack }) => {
  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-600 mb-4">Receita não encontrada.</p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-[#F97316] text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-gray-700 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{recipe.recipeName}</h1>
          {recipe.description && (
            <p className="text-gray-600 mt-2 text-lg leading-relaxed">{recipe.description}</p>
          )}
        </div>
      </div>

      {/* Status Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {recipe.servings && (
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#F97316] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.20-1.10-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#F97316]">{recipe.servings}</div>
                <div className="text-sm font-medium text-orange-700">Porções</div>
              </div>
            </div>
          </div>
        )}
        
        {recipe.totalTime && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{recipe.totalTime}min</div>
                <div className="text-sm font-medium text-blue-700">Tempo total</div>
              </div>
            </div>
          </div>
        )}
        
        {recipe.calories && (
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border border-red-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 14.22C9.11 14.32 9.15 14.42 9.15 14.55C9.15 14.71 9.05 14.86 8.95 15C8.31 15.9 7.68 16.8 7.21 17.8C6.15 20.3 7.95 21.81 9.85 21.35C11.58 20.93 12.85 19.83 13.64 18.32C14.5 16.66 14.68 14.8 14.82 12.97C14.87 12.25 14.9 11.53 14.97 10.8C15.02 10.13 15.11 9.47 15.37 8.88C15.9 7.69 17.05 6.8 17.95 5.7C18.95 4.5 19.68 2.9 19.5 1C18.1 1.85 16.9 3.1 16.1 4.6C15.39 5.9 15.03 7.4 15.11 8.9C15.16 9.8 15.37 10.66 15.63 11.5C15.81 12.2 16.08 12.85 16.4 13.5C16.87 14.4 17.4 15.28 17.75 16.25C18.25 17.6 18.35 19.15 17.85 20.5C17.37 21.8 16.3 22.85 14.97 23.1C14.18 23.25 13.37 23.1 12.58 22.9C11.25 22.6 10.05 21.9 9.17 20.9C8.95 20.65 8.75 20.4 8.58 20.1C8.17 19.4 7.85 18.6 7.7 17.8C7.5 16.6 7.55 15.35 7.85 14.15C8.07 13.35 8.4 12.6 8.8 11.9C9.15 11.25 9.55 10.65 9.95 10C10.35 9.4 10.75 8.8 11.15 8.15C11.45 7.65 11.75 7.1 12.05 6.55C12.35 6 12.65 5.4 12.95 4.8C13.25 4.2 13.55 3.6 13.85 3C14.15 2.4 14.45 1.8 14.75 1.2C15.05 0.6 15.35 0 15.65 -0.6"/>
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{recipe.calories}</div>
                <div className="text-sm font-medium text-red-700">Calorias</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3">
            {recipe.tags.map((tag, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-gradient-to-r from-orange-100 to-orange-200 text-[#F97316] rounded-full text-sm font-medium border border-orange-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Layout - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Ingredients (narrower) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Ingredients */}
          {recipe.ingredientsNeeded && recipe.ingredientsNeeded.length > 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 pb-3 border-b-3 border-[#F97316] inline-block">
                  Ingredientes
                </h2>
              </div>
              <ul className="space-y-4">
                {recipe.ingredientsNeeded.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-3 h-3 bg-[#F97316] rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-gray-700 leading-relaxed">
                      {ingredient.quantity && ingredient.unit && ingredient.name ? (
                        <>
                          <strong className="text-gray-900 font-semibold">{ingredient.quantity} {ingredient.unit}</strong> de {ingredient.name}
                        </>
                      ) : (
                        ingredient.name || 'Ingrediente não especificado'
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ingredients to buy (Market Mode) */}
          {recipe.ingredientsToBuy && recipe.ingredientsToBuy.length > 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 pb-3 border-b-3 border-red-500 inline-block">
                  Ingredientes para comprar
                </h2>
              </div>
              <ul className="space-y-4">
                {recipe.ingredientsToBuy.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-gray-700 leading-relaxed">
                      {ingredient.quantity && ingredient.unit && ingredient.name ? (
                        <>
                          <strong className="text-gray-900 font-semibold">{ingredient.quantity} {ingredient.unit}</strong> de {ingredient.name}
                        </>
                      ) : (
                        ingredient.name || 'Ingrediente não especificado'
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Right Column - Instructions (wider) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Instructions */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 pb-3 border-b-3 border-[#F97316] inline-block">
                Modo de Preparo
              </h2>
            </div>
            <ol className="space-y-6">
              {recipe.howToPrepare.map((step, index) => (
                <li key={index} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#F97316] text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 leading-relaxed pt-3 text-lg">{step}</p>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>

      {/* Additional Sections - Full Width */}
      
      {/* Techniques */}
      {recipe.techniques && recipe.techniques.length > 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 pb-3 border-b-3 border-[#F97316] inline-block">
              Técnicas Culinárias
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipe.techniques.map((technique, index) => (
              <div key={index} className="border-l-4 border-[#F97316] pl-6 py-4 bg-orange-50 rounded-r-xl">
                <h3 className="font-bold text-gray-900 text-lg mb-2">{technique.term}</h3>
                <p className="text-gray-700 leading-relaxed">{technique.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Questions */}
      {recipe.commonQuestions && recipe.commonQuestions.length > 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 pb-3 border-b-3 border-[#F97316] inline-block">
              Perguntas Frequentes
            </h2>
          </div>
          <div className="space-y-4">
            {recipe.commonQuestions.map((question, index) => (
              <div key={index} className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <p className="text-gray-700 leading-relaxed font-medium">{question}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom action */}
      <div className="text-center pt-8">
        <button
          onClick={onBack}
          className="px-10 py-4 bg-[#F97316] text-white rounded-2xl hover:bg-orange-600 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Nova Busca
        </button>
      </div>
    </div>
  );
};

export default RecipeDetailView;
