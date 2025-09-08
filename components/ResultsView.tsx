import React, { useState } from 'react';
import { Recipe, ResultsMode, WeeklyPlan, UserSettings, MealType, MEAL_TYPES, AppMode, EffortFilter } from '../types';
import WeeklyPlanView from './WeeklyPlanView';
import FlavorProfileBanner from './FlavorProfileBanner';
import MealTypeSelector from './MealTypeSelector';

interface ResultsViewProps {
  appMode: AppMode | null;
  imageUrls: string[];
  ingredients: string[];
  selectedIngredients: string[];
  ingredientsForCurrentRecipes: string[];
  
  recipes: Recipe[];
  marketRecipes: Recipe[];
  weeklyPlan: WeeklyPlan | null;
  resultsMode: ResultsMode;
  onResultsModeChange: (mode: ResultsMode) => void;
  onFetchMarketRecipes: () => void;
  isFetchingMarketRecipes: boolean;
  onFetchWeeklyPlan: (duration: number, mealTypes: MealType[]) => void;
  isFetchingWeeklyPlan: boolean;


  onReset: () => void;
  onRegenerate: (newIngredients: string[]) => void;
  onAddIngredient: (ingredient: string) => void;
  onRemoveIngredient: (ingredient: string) => void;
  onSelectedIngredientsChange: (newSelection: string[]) => void;
  isRegenerating: boolean;
  onMoreRecipes: () => void;
  isFetchingMore: boolean;
  savedRecipes: Recipe[];
  onToggleSave: (recipe: Recipe) => void;
  onViewRecipe: (recipe: Recipe) => void;
  onRemoveRecipe: (id: string) => void;
  onReplaceRecipe: (index: number) => void;
  replacingRecipeIndex: number | null;

  userSettings: UserSettings;
  onShowSettings: () => void;
  onDismissFlavorProfilePrompt: () => void;
  
  selectedMealTypes: MealType[];
  onSelectedMealTypesChange: (mealTypes: MealType[]) => void;
  effortFilters: EffortFilter[];
  onEffortFiltersChange: (filters: EffortFilter[]) => void;
  error: string | null;
  hasGenerationsLeft: boolean;
}


const ResultsView: React.FC<ResultsViewProps> = ({ 
  appMode,
  imageUrls, 
  ingredients,
  selectedIngredients,
  ingredientsForCurrentRecipes,
  recipes,
  marketRecipes,
  weeklyPlan,
  resultsMode,
  onResultsModeChange,
  onFetchMarketRecipes,
  isFetchingMarketRecipes,
  onFetchWeeklyPlan,
  isFetchingWeeklyPlan,
  onReset, 
  onRegenerate,
  onAddIngredient,
  onRemoveIngredient,
  onSelectedIngredientsChange,
  isRegenerating, 
  onMoreRecipes, 
  isFetchingMore,
  savedRecipes,
  onToggleSave,
  onViewRecipe,
  onRemoveRecipe,
  onReplaceRecipe,
  replacingRecipeIndex,
  userSettings,
  onShowSettings,
  onDismissFlavorProfilePrompt,
  selectedMealTypes,
  onSelectedMealTypesChange,
  effortFilters,
  onEffortFiltersChange,
  error,
  hasGenerationsLeft,
}) => {
  const [newIngredient, setNewIngredient] = useState('');
  const [plannerMealTypes, setPlannerMealTypes] = useState<MealType[]>(['Almoço', 'Jantar']);
  const [showFilters, setShowFilters] = useState(false);


  const isSingleRecipeMode = appMode === AppMode.DISH_PHOTO;
  const isLeftoversMode = appMode === AppMode.LEFTOVERS;

  const handleTabChange = (mode: ResultsMode) => {
    if (mode !== resultsMode && !hasGenerationsLeft && (mode === ResultsMode.MARKET_MODE || mode === ResultsMode.WEEKLY_PLAN)) {
        // Here you might want to show the upgrade modal
        // For now, just prevent the action.
        return;
    }
    onResultsModeChange(mode);
    if (mode === ResultsMode.MARKET_MODE) {
      onFetchMarketRecipes();
    }
  };

  const handleIngredientSelectionChange = (ingredient: string) => {
    const newSelection = selectedIngredients.includes(ingredient)
      ? selectedIngredients.filter(i => i !== ingredient)
      : [...selectedIngredients, ingredient];
    onSelectedIngredientsChange(newSelection);
  };

  const handleMealFilterChange = (newMeals: MealType[]) => {
    onSelectedMealTypesChange(newMeals);
    if(hasGenerationsLeft) {
      onRegenerate(selectedIngredients);
    }
  };
  
  const handleEffortFilterChange = (filter: EffortFilter) => {
    const newFilters = effortFilters.includes(filter)
      ? effortFilters.filter(f => f !== filter)
      : [...effortFilters, filter];
    onEffortFiltersChange(newFilters);
    if(hasGenerationsLeft) {
      onRegenerate(selectedIngredients);
    }
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIngredient.trim()) {
      onAddIngredient(newIngredient);
      setNewIngredient('');
    }
  };
  
  const handleRegenerateClick = () => {
    onRegenerate(selectedIngredients);
  };
  
  const selectionChanged = JSON.stringify(selectedIngredients.slice().sort()) !== JSON.stringify(ingredientsForCurrentRecipes.slice().sort());
  
  const recipesToDisplay = resultsMode === ResultsMode.USE_WHAT_I_HAVE ? recipes : marketRecipes;
  const isLoadingRecipes = isRegenerating || (resultsMode === ResultsMode.MARKET_MODE && isFetchingMarketRecipes);

  const { flavorProfile, flavorProfilePromptDismissed } = userSettings;
  const isFlavorProfileSet = flavorProfile.favoriteCuisines.length > 0 || !!flavorProfile.spiceLevel;
  const showFlavorProfileBanner = !isFlavorProfileSet && !flavorProfilePromptDismissed;

  const renderContent = () => {
    if (resultsMode === ResultsMode.WEEKLY_PLAN) {
        if (isFetchingWeeklyPlan) {
            return (
                 <div className="flex flex-col justify-center items-center py-20 text-center">
                    <svg className="animate-spin h-10 w-10 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-slate-600">Montando seu plano semanal...</p>
                </div>
            )
        }
        if (weeklyPlan) {
            return <WeeklyPlanView plan={weeklyPlan} onViewRecipe={onViewRecipe} />;
        }
        return (
            <div className="text-center py-12 px-6 bg-white rounded-lg border border-slate-200">
                <h4 className="text-xl font-semibold text-slate-800">Planeje sua semana</h4>
                <p className="mt-2 text-slate-500">
                  Selecione as refeições, a duração, e a IA criará um cardápio com lista de compras.
                </p>
                <div className="my-6">
                    <MealTypeSelector 
                        selectedMeals={plannerMealTypes}
                        onChange={setPlannerMealTypes}
                    />
                </div>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => onFetchWeeklyPlan(3, plannerMealTypes)} disabled={plannerMealTypes.length === 0 || !hasGenerationsLeft} className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed">3 Dias</button>
                    <button onClick={() => onFetchWeeklyPlan(5, plannerMealTypes)} disabled={plannerMealTypes.length === 0 || !hasGenerationsLeft} className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed">5 Dias</button>
                    <button onClick={() => onFetchWeeklyPlan(7, plannerMealTypes)} disabled={plannerMealTypes.length === 0 || !hasGenerationsLeft} className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed">7 Dias</button>
                </div>
            </div>
        )
    }

    if (isLoadingRecipes) {
         return (
            <div className="flex justify-center items-center py-20">
                <svg className="animate-spin h-10 w-10 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
          )
    }

    if (recipesToDisplay.length > 0) {
        return (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
              {recipesToDisplay.map((recipe, index) => {
                const isSaved = savedRecipes.some(r => r.id === recipe.id);
                return (
                  <div key={recipe.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group aspect-[3/4] flex flex-col">
                    {/* Card Header */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight pr-2 flex-1" style={{
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          overflow: 'hidden'
                        }}>
                          {recipe.recipeName}
                        </h3>
                        <button 
                          onClick={() => onToggleSave(recipe)} 
                          className="flex-shrink-0 p-1.5 rounded-full hover:bg-slate-100 transition-colors group/heart"
                          aria-label={isSaved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-5 w-5 transition-colors ${isSaved ? 'text-red-500 fill-current' : 'text-slate-400 group-hover/heart:text-red-400'}`} 
                            fill={isSaved ? 'currentColor' : 'none'} 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                      </div>

                      {/* Info Tags */}
                      {(recipe.calories || recipe.totalTime) && (
                        <div className="flex items-center gap-3 mb-3 text-sm text-slate-600">
                          {recipe.calories && (
                            <div className="flex items-center gap-1">
                              <span className="text-base">⚡</span>
                              <span><strong>{recipe.calories}</strong> kcal</span>
                            </div>
                          )}
                          {recipe.totalTime && (
                            <div className="flex items-center gap-1">
                              <span className="text-base">🕒</span>
                              <span><strong>{recipe.totalTime}</strong> min</span>
                            </div>
                          )}
                          {recipe.tags && recipe.tags.includes('Fácil') && (
                            <span className="text-base">Fácil</span>
                          )}
                          {recipe.tags && recipe.tags.includes('Médio') && (
                            <span className="text-base">Médio</span>
                          )}
                          {recipe.tags && recipe.tags.includes('Difícil') && (
                            <span className="text-base">Difícil</span>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-slate-600 text-sm leading-relaxed mb-3 flex-1" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        overflow: 'hidden'
                      }}>
                        {recipe.description}
                      </p>

                      {/* Tags */}
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {recipe.tags.filter(tag => !['Fácil', 'Médio', 'Difícil'].includes(tag)).slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 pt-0 mt-auto">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewRecipe(recipe)}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200 text-sm"
                        >
                          Ver Receita
                        </button>
                        <button
                          onClick={() => onReplaceRecipe(index)}
                          disabled={!hasGenerationsLeft || replacingRecipeIndex === index}
                          className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Substituir receita"
                        >
                          {replacingRecipeIndex === index ? (
                            <svg className="animate-spin h-4 w-4 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a9 9 0 0114.23-5.77M20 15a9 9 0 01-14.23 5.77" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
               {resultsMode === ResultsMode.USE_WHAT_I_HAVE && !isSingleRecipeMode && !isLeftoversMode && (
                <div className="col-span-full flex justify-center pt-4">
                  <button
                    onClick={onMoreRecipes}
                    disabled={isFetchingMore || !hasGenerationsLeft}
                    className="inline-flex justify-center items-center px-8 py-3 border border-slate-300 text-base font-medium rounded-xl shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isFetchingMore ? 'Buscando...' : (hasGenerationsLeft ? 'Mais Receitas' : 'Limite diário atingido')}
                  </button>
                </div>
               )}
            </div>
          )
    }

    return (
        <div className="text-center py-20 px-6 bg-white rounded-lg border border-slate-200">
            <h4 className="text-xl font-semibold text-slate-800">Nenhuma receita encontrada</h4>
            <p className="mt-2 text-slate-500">
              {resultsMode === ResultsMode.USE_WHAT_I_HAVE 
                ? "Não conseguimos criar receitas com os ingredientes e filtros selecionados. Que tal mudar os filtros?"
                : "Não conseguimos criar sugestões do mercado com base nos seus ingredientes e filtros."}
            </p>
        </div>
      )
  }

  if (isSingleRecipeMode || isLeftoversMode) {
    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
                {isLeftoversMode ? (
                    <>
                      <h2 className="text-3xl font-bold text-slate-800 mb-2">Transformando suas sobras!</h2>
                      <p className="text-lg text-slate-600">Aqui estão algumas ideias criativas para o prato de ontem.</p>
                    </>
                ) : (
                    <>
                      <h2 className="text-3xl font-bold text-slate-800 mb-2">Aqui está a sua receita!</h2>
                      <p className="text-lg text-slate-600">Baseada na foto que você enviou.</p>
                    </>
                )}
            </div>
            
            {/* Content */}
            <div className="max-w-4xl mx-auto">
                {renderContent()}
            </div>
            
            {/* Reset Button */}
            <div className="mt-12 text-center">
                <button
                    onClick={onReset}
                    className="px-8 py-3 border border-slate-300 text-base font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                    Começar de Novo
                </button>
            </div>
        </div>
    );
  }


  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          {resultsMode === ResultsMode.USE_WHAT_I_HAVE && 'Receitas com seus ingredientes'}
          {resultsMode === ResultsMode.MARKET_MODE && 'Sugestões do mercado'}
          {resultsMode === ResultsMode.WEEKLY_PLAN && 'Planejamento semanal'}
        </h2>
        <p className="text-lg text-slate-600">
          {resultsMode === ResultsMode.USE_WHAT_I_HAVE && 'Criadas especialmente com o que você tem disponível'}
          {resultsMode === ResultsMode.MARKET_MODE && 'Inspire-se com essas deliciosas opções'}
          {resultsMode === ResultsMode.WEEKLY_PLAN && 'Monte seu cardápio da semana com lista de compras'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-r-lg mb-6 shadow-sm" role="alert">
          <div className="flex">
            <div className="py-1">
              <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Ocorreu um Erro</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Flavor Profile Banner */}
      {showFlavorProfileBanner && (
        <FlavorProfileBanner
          onOpenSettings={onShowSettings}
          onDismiss={onDismissFlavorProfilePrompt}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex justify-center space-x-8 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => handleTabChange(ResultsMode.USE_WHAT_I_HAVE)}
            className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              resultsMode === ResultsMode.USE_WHAT_I_HAVE
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span role="img" aria-label="check mark">✅</span>
            Com o que Você Tem
          </button>
          <button
            onClick={() => handleTabChange(ResultsMode.MARKET_MODE)}
            className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              resultsMode === ResultsMode.MARKET_MODE
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!hasGenerationsLeft && resultsMode !== ResultsMode.MARKET_MODE ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span role="img" aria-label="shopping cart">🛒</span>
            Sugestões do Mercado
          </button>
          <button
            onClick={() => handleTabChange(ResultsMode.WEEKLY_PLAN)}
            className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              resultsMode === ResultsMode.WEEKLY_PLAN
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!hasGenerationsLeft && resultsMode !== ResultsMode.WEEKLY_PLAN ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span role="img" aria-label="calendar">📅</span>
            Planejar Minha Semana
          </button>
        </nav>
      </div>

      {/* Filters Section - Only show for recipes modes */}
      {(resultsMode === ResultsMode.USE_WHAT_I_HAVE || resultsMode === ResultsMode.MARKET_MODE) && (
        <div className="mb-8">
          {/* Toggle Filters Button (Mobile) */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden w-full flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4"
          >
            <span className="text-lg font-semibold text-slate-800">Filtros e Ingredientes</span>
            <svg className={`h-6 w-6 text-slate-500 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Filters Content */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block bg-white rounded-2xl border border-slate-200 shadow-sm p-6`}>
            {/* Fit Mode Banner */}
            {userSettings.isFitMode && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-green-800">Modo Fit Ativo</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Meal Type Filters */}
              <div>
                <h4 className="text-base font-semibold text-slate-700 mb-3">Tipo de Refeição</h4>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map(mealType => (
                    <button
                      key={mealType}
                      onClick={() => {
                        const newMeals = selectedMealTypes.includes(mealType)
                          ? selectedMealTypes.filter(m => m !== mealType)
                          : [...selectedMealTypes, mealType];
                        handleMealFilterChange(newMeals);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                        selectedMealTypes.includes(mealType)
                          ? 'bg-orange-100 border-orange-300 text-orange-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {mealType}
                    </button>
                  ))}
                </div>
              </div>

              {/* Effort Filters */}
              <div>
                <h4 className="text-base font-semibold text-slate-700 mb-3">Facilidade</h4>
                <div className="flex flex-wrap gap-2">
                  {(['Rápido (-30 min)', 'Uma Panela Só', 'Sem Forno'] as EffortFilter[]).map(filter => (
                    <button
                      key={filter}
                      onClick={() => handleEffortFilterChange(filter)}
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                        effortFilters.includes(filter)
                          ? 'bg-orange-100 border-orange-300 text-orange-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="text-base font-semibold text-slate-700 mb-3">Ingredientes Disponíveis</h4>
                
                {ingredients.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                      {ingredients.map((ingredient, index) => (
                        <button
                          key={index}
                          onClick={() => handleIngredientSelectionChange(ingredient)}
                          className={`relative group px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
                            selectedIngredients.includes(ingredient)
                              ? 'bg-orange-100 border-orange-300 text-orange-800'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="capitalize">{ingredient}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveIngredient(ingredient);
                            }} 
                            className="ml-2 opacity-60 hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                            aria-label={`Remover ${ingredient}`}
                          >
                            ×
                          </button>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mb-4">Nenhum ingrediente detectado</p>
                )}
                
                <form onSubmit={handleAddIngredient} className="flex gap-2">
                  <input 
                    type="text"
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    placeholder="Adicionar ingrediente"
                    className="flex-1 bg-white border border-slate-300 text-slate-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                  >
                    Adicionar
                  </button>
                </form>
              </div>
            </div>

            {/* Regenerate Button */}
            {selectionChanged && (
              <div className="mt-6 flex justify-center">
                <button 
                  onClick={handleRegenerateClick}
                  disabled={isRegenerating || !hasGenerationsLeft}
                  className="px-8 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRegenerating ? 'Buscando...' : (hasGenerationsLeft ? 'Buscar com Filtros Aplicados' : 'Limite diário atingido')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {renderContent()}

      {/* Reset Button */}
      <div className="mt-12 text-center">
        <button
          onClick={onReset}
          className="px-8 py-3 border border-slate-300 text-base font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        >
          Começar de Novo
        </button>
      </div>
    </div>
  );
};

export default ResultsView;