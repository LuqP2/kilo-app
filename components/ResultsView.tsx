import React, { useState, useEffect, useRef } from 'react';
import { Recipe, ResultsMode, WeeklyPlan, UserSettings, MealType, MEAL_TYPES, AppMode, EffortFilter, EFFORT_FILTERS } from '../types';
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
  onRegenerate: (newIngredients: string[], mealTypes: MealType[], effortFilters: EffortFilter[]) => void;
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
  onSelectedEffortFiltersChange: (filters: EffortFilter[]) => void;
  error: string | null;
  hasGenerationsLeft: boolean;
}


const RecipeCardActions: React.FC<{
  recipe: Recipe;
  index: number;
  onReplace: () => void;
  onRemove: () => void;
  isReplacing: boolean;
  disabled: boolean;
}> = ({ recipe, index, onReplace, onRemove, isReplacing, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="absolute top-4 right-4">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        disabled={disabled || isReplacing}
        className="p-1 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Opções da receita"
      >
        {isReplacing ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
        )}
      </button>

      {isOpen && !isReplacing && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200">
          <button
            onClick={() => { onReplace(); setIsOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
            Substituir
          </button>
          <button
            onClick={() => { onRemove(); setIsOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Remover
          </button>
        </div>
      )}
    </div>
  );
};


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
  onSelectedEffortFiltersChange,
  error,
  hasGenerationsLeft,
}) => {
  const [newIngredient, setNewIngredient] = useState('');
  const [plannerMealTypes, setPlannerMealTypes] = useState<MealType[]>(['Almoço', 'Jantar']);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)'); // lg breakpoint
    const handleResize = () => {
        setIsFiltersVisible(mediaQuery.matches);
    };
    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


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
      onRegenerate(selectedIngredients, newMeals, effortFilters);
    }
  };
  
  const handleEffortFilterChange = (filter: EffortFilter) => {
    const newFilters = effortFilters.includes(filter)
      ? effortFilters.filter(f => f !== filter)
      : [...effortFilters, filter];
    onSelectedEffortFiltersChange(newFilters);
    if(hasGenerationsLeft) {
      onRegenerate(selectedIngredients, selectedMealTypes, newFilters);
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
    onRegenerate(selectedIngredients, selectedMealTypes, effortFilters);
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
            <div className="space-y-4">
              {recipesToDisplay.map((recipe, index) => {
                const isSaved = savedRecipes.some(r => r.id === recipe.id);
                return (
                  <div key={recipe.id} className="relative bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-lg hover:border-orange-300 group active:scale-[0.98] active:shadow-md">
                    <button onClick={() => onViewRecipe(recipe)} className="w-full text-left">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <button onClick={(e) => { e.stopPropagation(); onToggleSave(recipe); }} className="flex-shrink-0 text-slate-400 hover:text-orange-500 transition-colors" aria-label={isSaved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" className={isSaved ? 'text-orange-500' : ''} />
                            </svg>
                          </button>
                          <div className="flex-grow">
                              <h4 className="text-lg font-bold text-slate-800">{recipe.recipeName}</h4>
                              <p className="mt-1 text-slate-600 line-clamp-2 text-sm">{recipe.description}</p>
                          </div>
                        </div>
                        {(recipe.calories || recipe.totalTime) && (
                            <div className="mt-3 flex items-center gap-x-4 gap-y-2 flex-wrap text-sm text-slate-600 pt-3 border-t border-slate-100">
                                {recipe.totalTime && (
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                        <strong className="font-semibold">{recipe.totalTime}</strong>
                                    </div>
                                )}
                                {recipe.calories && (
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934l-.546 1.073a1 1 0 001.24 1.45l.546-1.073a.5.5 0 01.725-.192l.546 1.073a1 1 0 001.24-1.45l-.546-1.073a.5.5 0 01.385-.725l.243.485a1 1 0 001.24-1.45l-.243-.485a.5.5 0 01.614-.558 1 1 0 00.385-1.45c-.23-.345-.558-.614-.934-.822l-1.073-.546zM9 4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM3 10a1 1 0 011-1h.01a1 1 0 110 2H4a1 1 0 01-1-1zM7 16a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zM12 10a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1zM9 14a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span><strong className="font-semibold">{recipe.calories}</strong> kcal / porção</span>
                                    </div>
                                )}
                            </div>
                        )}
                         {recipe.tags && recipe.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                            {recipe.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">{tag}</span>
                            ))}
                            </div>
                        )}
                      </div>
                      <div className="bg-slate-50/75 px-4 py-2 border-t border-slate-200 group-hover:bg-orange-50">
                        <span className="text-sm font-semibold text-orange-600">
                          Ver Modo de Preparo &rarr;
                        </span>
                      </div>
                    </button>
                     <RecipeCardActions 
                        recipe={recipe}
                        index={index}
                        onReplace={() => onReplaceRecipe(index)}
                        onRemove={() => onRemoveRecipe(recipe.id)}
                        isReplacing={replacingRecipeIndex === index}
                        disabled={!hasGenerationsLeft}
                      />
                  </div>
                )
              })}
               {resultsMode === ResultsMode.USE_WHAT_I_HAVE && !isSingleRecipeMode && !isLeftoversMode && (
                <div className="pt-4">
                  <button
                    onClick={onMoreRecipes}
                    disabled={isFetchingMore || !hasGenerationsLeft}
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-slate-300 text-base font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="w-full">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                {isLeftoversMode ? (
                      <>
                        <h2 className="text-3xl font-bold text-slate-800">Transformando suas sobras!</h2>
                        <p className="mt-2 text-lg text-slate-600">Aqui estão algumas ideias criativas para o prato de ontem.</p>
                      </>
                  ) : (
                      <>
                        <h2 className="text-3xl font-bold text-slate-800">Aqui está a sua receita!</h2>
                        <p className="mt-2 text-lg text-slate-600">Baseada na foto que você enviou.</p>
                      </>
                  )}
                </div>
                {renderContent()}
            </div>
            <div className="mt-12 text-center lg:block hidden">
                <button
                    onClick={onReset}
                    className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-800 shadow-sm hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                >
                    Começar de Novo
                </button>
            </div>
            <button
                onClick={onReset}
                className="lg:hidden fixed bottom-6 right-6 bg-slate-800 text-white rounded-full p-4 shadow-lg hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 z-30"
                aria-label="Começar de Novo"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a9 9 0 0114.23-5.77M20 15a9 9 0 01-14.23 5.77" />
                </svg>
            </button>
        </div>
    );
  }


  return (
    <div className="w-full">
      <div className="lg:hidden mb-4">
        <button 
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
            className="w-full flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
        >
            <span className="text-lg font-bold text-slate-800">Fotos e Filtros</span>
            <svg className={`h-6 w-6 text-slate-500 transform transition-transform ${isFiltersVisible ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
        
        <aside className={`lg:col-span-1 space-y-8 lg:sticky lg:top-24 self-start ${isFiltersVisible ? 'block' : 'hidden'} lg:block`}>
          {imageUrls.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Suas Fotos</h2>
              <div className="grid grid-cols-2 gap-4">
              {imageUrls.map((url, index) => (
                <img key={index} src={url} alt={`Conteúdo da geladeira ${index + 1}`} className="rounded-lg object-cover w-full aspect-square" />
              ))}
              </div>
            </div>
          )}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
                Filtros
            </h3>
            
            {userSettings.isFitMode && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Modo Fit Ativo</span>
                </div>
            )}

            <div className="space-y-6">
              <div>
                <h4 className="text-base font-medium text-slate-700">Refeição</h4>
                <div className="mt-2">
                  <MealTypeSelector
                    selectedMeals={selectedMealTypes}
                    onChange={handleMealFilterChange}
                  />
                </div>
              </div>
              <div>
                <h4 className="text-base font-medium text-slate-700">Custo de Esforço</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EFFORT_FILTERS.map(filter => {
                    const isSelected = effortFilters.includes(filter);
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => handleEffortFilterChange(filter)}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition-all duration-200 ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {filter}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                  <h4 className="text-base font-medium text-slate-700">Ingredientes</h4>
                  {ingredients.length > 0 ? (
                      <ul className="space-y-3 mt-2">
                      {ingredients.map((ingredient, index) => (
                          <li key={index} className="flex items-center justify-between group">
                            <label className="flex items-center flex-grow min-w-0 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedIngredients.includes(ingredient)}
                                onChange={() => handleIngredientSelectionChange(ingredient)}
                                className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-3 text-slate-700 capitalize truncate">
                                {ingredient}
                              </span>
                            </label>
                            <button 
                                onClick={() => onRemoveIngredient(ingredient)} 
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 flex-shrink-0 h-5 w-5 rounded-full inline-flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-600" 
                                aria-label={`Remover ${ingredient}`}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11L11 5M5 5l6 6"></path></svg>
                            </button>
                          </li>
                      ))}
                      </ul>
                  ) : (
                      <p className="text-slate-500">Nenhum ingrediente. Adicione alguns para começar.</p>
                  )}
                  
                  <form onSubmit={handleAddIngredient} className="mt-4 flex gap-2">
                  <input 
                      type="text"
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      placeholder="Adicionar ingrediente"
                      className="flex-grow min-w-0 bg-white border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm"
                  />
                  <button 
                      type="submit"
                      className="inline-flex items-center justify-center h-10 w-10 border border-slate-300 text-lg font-medium rounded-md text-slate-600 bg-white hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                      +
                  </button>
                  </form>
              </div>
            </div>

            {selectionChanged && (
            <div className="mt-6">
                <button 
                onClick={handleRegenerateClick}
                disabled={isRegenerating || !hasGenerationsLeft}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isRegenerating ? 'Buscando...' : (hasGenerationsLeft ? 'Buscar com Selecionados' : 'Limite diário atingido')}
                </button>
            </div>
            )}
          </div>
        </aside>

        <main className="lg:col-span-2">
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
          {showFlavorProfileBanner && (
            <FlavorProfileBanner
              onOpenSettings={onShowSettings}
              onDismiss={onDismissFlavorProfilePrompt}
            />
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => handleTabChange(ResultsMode.USE_WHAT_I_HAVE)}
                className={`shrink-0 flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                className={`shrink-0 flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                className={`shrink-0 flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${
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
          
          {renderContent()}

        </main>
      </div>
      <div className="mt-12 text-center lg:block hidden">
        <button
          onClick={onReset}
          className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-800 shadow-sm hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          Começar de Novo
        </button>
      </div>
      <button
        onClick={onReset}
        className="lg:hidden fixed bottom-6 right-6 bg-slate-800 text-white rounded-full p-4 shadow-lg hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 z-30"
        aria-label="Começar de Novo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a9 9 0 0114.23-5.77M20 15a9 9 0 01-14.23 5.77" />
        </svg>
      </button>
    </div>
  );
};

export default ResultsView;