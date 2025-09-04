import React, { useState, useCallback, useEffect } from 'react';
import { Recipe, AppState, ResultsMode, WeeklyPlan, UserSettings, MealType, AppMode, Ingredient, EffortFilter } from './types';
import { identifyIngredients, getRecipeFromImage, suggestRecipes, suggestSingleRecipe, suggestMarketModeRecipes, generateWeeklyPlan, analyzeRecipeForProfile, classifyImage, suggestLeftoverRecipes } from './services/geminiService';
import { getRemainingGenerations, FREE_PLAN_LIMIT, checkAndIncrementUsage } from './services/usageService';
import { AuthProvider, useAuth } from './AuthContext';

import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import LoadingView from './components/LoadingView';
import ResultsView from './components/ResultsView';
import Footer from './components/Footer';
import SavedRecipesModal from './components/SavedRecipesModal';
import RecipeModal from './components/RecipeModal';
import ManualIngredientInput from './components/ManualIngredientInput';
import SettingsModal from './components/SettingsModal';
import MealTypeSelector from './components/MealTypeSelector';
import RegionLockMessage from './components/RegionLockMessage';
import UpgradeModal from './components/UpgradeModal';

// Helper to add a unique ID to recipes
const addIdToRecipes = (recipes: Omit<Recipe, 'id'>[]): Recipe[] => {
  return recipes.map(recipe => ({ ...recipe, id: crypto.randomUUID() }));
};
const addIdToRecipe = (recipe: Omit<Recipe, 'id'>): Recipe => {
    return { ...recipe, id: crypto.randomUUID() };
};

const initialSettings: UserSettings = {
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isLactoseFree: false,
  isFitMode: false,
  allergies: '',
  effortFilters: [],
  flavorProfile: {
    favoriteCuisines: [],
    spiceLevel: '',
  },
  kitchenEquipment: [],
  pantryStaples: ['Sal', 'Pimenta do Reino', 'Azeite', 'Óleo de Cozinha', 'Vinagre', 'Açúcar', 'Alho', 'Cebola'],
  savedRecipeAnalysis: [],
  flavorProfilePromptDismissed: false,
  plan: 'free',
  dailyGenerations: {
    count: 0,
    lastReset: 0,
  }
};

const BASIC_PANTRY_ITEMS = ['Cebola', 'Alho', 'Sal', 'Azeite', 'Pimenta do Reino'];

const App: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [manualIngredients, setManualIngredients] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientsForCurrentRecipes, setIngredientsForCurrentRecipes] = useState<string[]>([]);
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [marketRecipes, setMarketRecipes] = useState<Recipe[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [resultsMode, setResultsMode] = useState<ResultsMode>(ResultsMode.USE_WHAT_I_HAVE);
  
  const [error, setError] = useState<string | null>(null);
  const [isRegionLockedError, setIsRegionLockedError] = useState(false);
  const [isRegeneratingRecipes, setIsRegeneratingRecipes] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isFetchingMarketRecipes, setIsFetchingMarketRecipes] = useState(false);
  const [isFetchingWeeklyPlan, setIsFetchingWeeklyPlan] = useState(false);
  const [replacingRecipeIndex, setReplacingRecipeIndex] = useState<number | null>(null);
  
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  const [userSettings, setUserSettings] = useState<UserSettings>(initialSettings);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<'preferences' | 'kitchen'>('preferences');

  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>(['Almoço', 'Jantar']);
  const [effortFilters, setEffortFilters] = useState<EffortFilter[]>([]);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(FREE_PLAN_LIMIT);

  // Adicione os estados locais para appliances e utensils
  const [appliances, setAppliances] = useState<string[]>([]);
  const [utensils, setUtensils] = useState<string[]>([]);

  const updateUsageCount = useCallback(() => {
    const remaining = getRemainingGenerations();
    setRemainingGenerations(remaining);
  }, []);

  const handleShowSettings = (initialTab: 'preferences' | 'kitchen' = 'preferences') => {
    setInitialSettingsTab(initialTab);
    setIsSettingsModalOpen(true);
  };

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedRecipes');
      if (saved) setSavedRecipes(JSON.parse(saved));
      
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        // Merge with initial settings to avoid breaking on old data structures
        const parsedSettings = JSON.parse(settings);
        setUserSettings(prev => ({...initialSettings, ...parsedSettings}));
      }
      updateUsageCount();

    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
  }, [updateUsageCount]);

  // Save data to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
    } catch (e) {
      console.error("Failed to save recipes to localStorage", e);
    }
  }, [savedRecipes]);

  useEffect(() => {
    try {
      localStorage.setItem('userSettings', JSON.stringify(userSettings));
      updateUsageCount();
    } catch (e) {
      console.error("Failed to save settings to localStorage", e);
    }
  }, [userSettings, updateUsageCount]);

  useEffect(() => {
    // When filters change, apply them to the main settings object
    // This makes it easy to pass all personalization options to the API
    setUserSettings(prev => ({...prev, effortFilters}));
  }, [effortFilters]);

  useEffect(() => {
    if (imageFiles.length > 0) {
      const urls = imageFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(urls);
      
      return () => {
        urls.forEach(url => URL.revokeObjectURL(url));
      };
    }
  }, [imageFiles]);

  // Sincronize os estados locais de appliances e utensils com userProfile.myKitchen quando userProfile mudar
  useEffect(() => {
    if (userProfile && userProfile.myKitchen) {
      setAppliances(userProfile.myKitchen.appliances || []);
      setUtensils(userProfile.myKitchen.utensils || []);
    }
  }, [userProfile]);

  const handleToggleSaveRecipe = useCallback(async (recipe: Recipe) => {
    const isSaved = savedRecipes.some(r => r.id === recipe.id);
    
    if (isSaved) {
      setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id));
    } else {
      setSavedRecipes(prev => [...prev, recipe]);
      // Implicit learning: Analyze the saved recipe and update flavor profile
      try {
        const keywords = await analyzeRecipeForProfile(recipe);
        if (keywords.length > 0) {
          setUserSettings(prev => ({
            ...prev,
            savedRecipeAnalysis: [...new Set([...prev.savedRecipeAnalysis, ...keywords])]
          }));
        }
      } catch (e) {
        console.error("Failed to analyze recipe for profile:", e);
        // Don't block the user, just log the error
      }
    }
  }, [savedRecipes]);
  
  const handleUpdateSavedRecipe = (recipeId: string, updates: Partial<Recipe>) => {
    const newSavedRecipes = savedRecipes.map(recipe => 
        recipe.id === recipeId ? { ...recipe, ...updates } : recipe
    );
    setSavedRecipes(newSavedRecipes);

    if (selectedRecipe && selectedRecipe.id === recipeId) {
        const fullyUpdatedRecipe = newSavedRecipes.find(r => r.id === recipeId);
        setSelectedRecipe(fullyUpdatedRecipe || null);
    }
  };

  const handleApiError = (e: unknown) => {
    console.error(e);
    if (e instanceof Error) {
        if (e.message.includes('LIMIT_REACHED')) {
            setError('Você atingiu seu limite diário de 5 receitas. Faça upgrade para o Kilo Pro para gerações ilimitadas!');
            setIsUpgradeModalOpen(true);
        } else if (e.message.includes('400')) {
          setIsRegionLockedError(true);
        } else if (e.message.includes('Ingrediente inválido detectado')) {
          setError(e.message);
        } else {
          setError('Desculpe, ocorreu um erro. Tente novamente.');
        }
    } else {
      setError('Ocorreu um erro desconhecido.');
    }
  }

  const startInitialSearch = useCallback(async (searchIngredients: string[]) => {
    if (searchIngredients.length === 0) return;
    setAppState(AppState.ANALYZING);
    setError(null);
    setIsRegionLockedError(false);
    setIngredients(searchIngredients);
    setSelectedIngredients(searchIngredients);
    setIngredientsForCurrentRecipes(searchIngredients);
    setRecipes([]);
    setMarketRecipes([]);
    setWeeklyPlan(null);
    setResultsMode(ResultsMode.USE_WHAT_I_HAVE);

    try {
      if (searchIngredients.length > 0) {
        const suggested = await suggestRecipes(searchIngredients, [], userSettings, selectedMealTypes);
        setRecipes(addIdToRecipes(suggested));
        updateUsageCount();
      }
      setAppState(AppState.SHOWING_RESULTS);
    } catch (e) {
      handleApiError(e);
      setAppState(AppState.IDLE);
    }
  }, [userSettings, selectedMealTypes, updateUsageCount]);

  const handleUnifiedImageUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Centralized usage check: only decrement on the three primary generation actions
    try {
      checkAndIncrementUsage();
    } catch (e) {
      handleApiError(e);
      return;
    }

    setImageFiles(files);
    setAppState(AppState.ANALYZING);
    setError(null);
    setIsRegionLockedError(false);
    
    // Reset results state
    setRecipes([]);
    setMarketRecipes([]);
    setWeeklyPlan(null);

    try {
        if (files.length > 1) {
            setAppMode(AppMode.INGREDIENTS);
            const foundIngredients = await identifyIngredients(files);
            updateUsageCount();
            await startInitialSearch(foundIngredients);
        } else {
            const file = files[0];
            const imageType = await classifyImage(file);

            if (imageType === 'DISH') {
                setAppMode(AppMode.DISH_PHOTO);
                const recipe = await getRecipeFromImage(file, userSettings);
                updateUsageCount();
                if (recipe) {
                    setRecipes([addIdToRecipe(recipe)]);
                    setAppState(AppState.SHOWING_RESULTS);
                } else {
                    setError('Não conseguimos identificar uma receita a partir desta imagem. Por favor, tente outra foto.');
                    setAppState(AppState.IDLE);
                }
            } else { // 'INGREDIENTS'
                setAppMode(AppMode.INGREDIENTS);
                const foundIngredients = await identifyIngredients(files);
                updateUsageCount();
                await startInitialSearch(foundIngredients);
            }
        }
    } catch (e) {
        handleApiError(e);
        setAppState(AppState.IDLE);
    }
  }, [userSettings, startInitialSearch, updateUsageCount]);

  const handleLeftoversImageUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];

    // Centralized usage check
    try {
      checkAndIncrementUsage();
    } catch (e) {
      handleApiError(e);
      return;
    }

    setImageFiles([file]);
    setAppState(AppState.ANALYZING);
    setError(null);
    setIsRegionLockedError(false);
    setAppMode(AppMode.LEFTOVERS);

    // Reset results state
    setRecipes([]);
    setMarketRecipes([]);
    setWeeklyPlan(null);

    try {
        const suggested = await suggestLeftoverRecipes(file, userSettings);
        updateUsageCount();
        if (suggested.length > 0) {
            setRecipes(addIdToRecipes(suggested));
            setResultsMode(ResultsMode.USE_WHAT_I_HAVE);
            setAppState(AppState.SHOWING_RESULTS);
        } else {
            setError('Não conseguimos criar novas receitas a partir desta imagem de sobras. Tente outra foto.');
            setAppState(AppState.IDLE);
        }
    } catch (e) {
        handleApiError(e);
        setAppState(AppState.IDLE);
    }
  }, [userSettings, updateUsageCount]);

  const handleManualSubmit = useCallback(async () => {
    if (manualIngredients.length === 0) return;
    setImageFiles([]);
    setPreviewUrls([]);
    setAppMode(AppMode.INGREDIENTS);
    // Centralized usage check
    try {
      checkAndIncrementUsage();
    } catch (e) {
      handleApiError(e);
      return;
    }

    await startInitialSearch(manualIngredients);
  }, [manualIngredients, startInitialSearch]);


  const regenerateRecipes = useCallback(async (ingredientsToSearch: string[]) => {
    setIsRegeneratingRecipes(true);
    setError(null);
    setIngredientsForCurrentRecipes(ingredientsToSearch);
    setMarketRecipes([]); // Invalidate market recipes as the base ingredients have changed
    setWeeklyPlan(null); // Invalidate weekly plan too
    setResultsMode(ResultsMode.USE_WHAT_I_HAVE);

    try {
      if (ingredientsToSearch.length > 0) {
        const suggested = await suggestRecipes(ingredientsToSearch, [], userSettings, selectedMealTypes);
        setRecipes(addIdToRecipes(suggested));
        updateUsageCount();
      } else {
        setRecipes([]);
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setIsRegeneratingRecipes(false);
    }
  }, [userSettings, selectedMealTypes, updateUsageCount]);

  const handleFetchMarketRecipes = useCallback(async () => {
    if (marketRecipes.length > 0 || isFetchingMarketRecipes) return;

    setIsFetchingMarketRecipes(true);
    setError(null);
    try {
      const suggested = await suggestMarketModeRecipes(ingredients, userSettings, selectedMealTypes);
      setMarketRecipes(addIdToRecipes(suggested));
      updateUsageCount();
    } catch (e) {
      handleApiError(e);
    } finally {
      setIsFetchingMarketRecipes(false);
    }
  }, [ingredients, marketRecipes, isFetchingMarketRecipes, userSettings, selectedMealTypes, updateUsageCount]);

  const handleFetchWeeklyPlan = useCallback(async (duration: number, mealTypesForPlan: MealType[]) => {
    if (isFetchingWeeklyPlan) return;
    
    setIsFetchingWeeklyPlan(true);
    setError(null);
    setWeeklyPlan(null);
    try {
        const plan = await generateWeeklyPlan(ingredients, duration, userSettings, mealTypesForPlan);
        updateUsageCount();
        if (plan) {
            // Add unique IDs to all recipes within the plan
            plan.plan.forEach(dailyPlan => {
                dailyPlan.meals.forEach(meal => {
                    meal.recipe.id = crypto.randomUUID();
                });
            });
            setWeeklyPlan(plan);
        }
    } catch (e) {
        handleApiError(e);
    } finally {
        setIsFetchingWeeklyPlan(false);
    }
  }, [ingredients, isFetchingWeeklyPlan, userSettings, updateUsageCount]);

  const handleAddIngredient = (ingredient: string) => {
    const trimmedIngredient = ingredient.trim().toLowerCase();
    if (!trimmedIngredient || ingredients.includes(trimmedIngredient)) return;

    const finalIngredients = ingredients.length === 0
      ? [trimmedIngredient, ...BASIC_PANTRY_ITEMS]
      : [...ingredients, trimmedIngredient];

    setIngredients(finalIngredients);
    setSelectedIngredients(finalIngredients);
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setIngredients(prev => prev.filter(ing => ing !== ingredientToRemove));
    setSelectedIngredients(prev => prev.filter(ing => ing !== ingredientToRemove));
  };
  
  const handleAddManualIngredient = (ingredient: string) => {
    const newIngredients = ingredient
      .split(',')
      .map(ing => ing.trim().toLowerCase())
      .filter(ing => ing && ing.length > 0 && !manualIngredients.includes(ing));

    if (newIngredients.length > 0) {
      setManualIngredients(prev => {
        const baseList = prev.length === 0 
          ? [...newIngredients, ...BASIC_PANTRY_ITEMS]
          : [...prev, ...newIngredients];
        
        return [...new Set(baseList)];
      });
    }
  };

  const handleRemoveManualIngredient = (ingredientToRemove: string) => {
    setManualIngredients(prev => prev.filter(ing => ing !== ingredientToRemove));
  };
  
  const handleMoreRecipes = useCallback(async () => {
    setIsFetchingMore(true);
    setError(null);
    try {
      const ingredientsToSearch = selectedIngredients.length > 0 ? selectedIngredients : ingredients;
      if (ingredientsToSearch.length > 0) {
        const more = await suggestRecipes(ingredientsToSearch, recipes, userSettings, selectedMealTypes);
        setRecipes(prevRecipes => [...prevRecipes, ...addIdToRecipes(more)]);
        updateUsageCount();
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setIsFetchingMore(false);
    }
  }, [ingredients, selectedIngredients, recipes, userSettings, selectedMealTypes, updateUsageCount]);

  const handleRemoveRecipe = (idToRemove: string) => {
    if (resultsMode === ResultsMode.USE_WHAT_I_HAVE) {
      setRecipes(prev => prev.filter(recipe => recipe.id !== idToRemove));
    } else {
      setMarketRecipes(prev => prev.filter(recipe => recipe.id !== idToRemove));
    }
  };

  const handleReplaceRecipe = useCallback(async (indexToReplace: number) => {
    setReplacingRecipeIndex(indexToReplace);
    setError(null);
    try {
        const ingredientsToSearch = selectedIngredients.length > 0 ? selectedIngredients : ingredients;
        const recipeList = resultsMode === ResultsMode.USE_WHAT_I_HAVE ? recipes : marketRecipes;
        
        const newRecipe = await suggestSingleRecipe(ingredientsToSearch, recipeList, userSettings, selectedMealTypes);
        updateUsageCount();
        if (newRecipe) {
            const recipeSetter = resultsMode === ResultsMode.USE_WHAT_I_HAVE ? setRecipes : setMarketRecipes;
            recipeSetter(prev => {
                const newRecipes = [...prev];
                newRecipes[indexToReplace] = addIdToRecipe(newRecipe);
                return newRecipes;
            });
        }
    } catch (e) {
      handleApiError(e);
    } finally {
        setReplacingRecipeIndex(null);
    }
  }, [ingredients, selectedIngredients, recipes, marketRecipes, resultsMode, userSettings, selectedMealTypes, updateUsageCount]);
  
  const handleReset = () => {
    setImageFiles([]);
    setPreviewUrls([]);
    setIngredients([]);
    setSelectedIngredients([]);
    setIngredientsForCurrentRecipes([]);
    setManualIngredients([]);
    setRecipes([]);
    setMarketRecipes([]);
    setWeeklyPlan(null);
    setError(null);
    setIsRegionLockedError(false);
    setAppState(AppState.IDLE);
    setAppMode(null);
    setResultsMode(ResultsMode.USE_WHAT_I_HAVE);
  };

  const handleDismissFlavorProfilePrompt = () => {
    setUserSettings(prev => ({...prev, flavorProfilePromptDismissed: true}));
  };

  const hasGenerationsLeft = remainingGenerations > 0;

  const renderContent = () => {
    if (isRegionLockedError) {
      return <RegionLockMessage onRetry={handleReset} />;
    }
    
    switch (appState) {
      case AppState.IDLE:
        const ingredientsIcon = (
          <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              <path d="M5 10h14"/>
              <path d="M8 6v-1"/>
          </svg>
        );
        const dishPhotoIcon = (
          <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <path d="M11 5a6 6 0 0 0-6 6"/>
          </svg>
        );
        const leftoversIcon = (
          <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 3v2.35M16.24 7.76l-1.78 1.79M18.6 12h-2.35M16.24 16.24l-1.78-1.79M12 18.6v2.35M7.76 16.24l1.79-1.78M5.4 12H3.05M7.76 7.76l1.79 1.78"/>
          </svg>
        );
        const kitchenIcon = (
          <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 15h2c1.1-1.4 2.3-2.5 3.5-3.5s2.6-1.8 4-2.5V3h3v6c-1.4.7-2.8 1.5-4 2.5s-2.4 2.1-3.5 3.5H2v3h4.6c.3.5.7 1 1.1 1.5.4.5.9.9 1.4 1.2" />
            <path d="M22 15h-2c-1.1-1.4-2.3-2.5-3.5-3.5s-2.6-1.8-4-2.5V3h-3v6c1.4.7 2.8 1.5 4 2.5s2.4 2.1 3.5 3.5h5v3h-4.6c-.3.5-.7 1-1.1 1.5-.4.5-.9.9-1.4 1.2" />
            <path d="M5 22h14" />
          </svg>
        );

        return (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">O que vamos cozinhar hoje?</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Comece filtrando por tipo de refeição, se desejar.
              </p>
            </div>
            
            <div className="w-full max-w-2xl mt-8">
              <MealTypeSelector
                selectedMeals={selectedMealTypes}
                onChange={setSelectedMealTypes}
              />
            </div>

            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-semibold text-slate-800">Tenho Ingredientes</h3>
                <p className="mt-2 text-slate-500 h-12">Fotografe o interior da sua geladeira ou despensa para começar.</p>
                <ImageUploader 
                  onImageUpload={handleUnifiedImageUpload}
                  multiple={true}
                  maxFiles={5}
                  uploadText="Enviar foto da geladeira"
                  uploadSubtext="(ou despensa, até 5 fotos)"
                  icon={ingredientsIcon}
                  disabled={!hasGenerationsLeft}
                />
              </div>

              <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-semibold text-slate-800">Que Prato é Esse?</h3>
                <p className="mt-2 text-slate-500 h-12">Envie a foto de um prato pronto e descubra a receita.</p>
                <ImageUploader 
                  onImageUpload={handleUnifiedImageUpload}
                  multiple={false}
                  maxFiles={1}
                  uploadText="Envie a foto de um prato"
                  uploadSubtext="(1 foto)"
                  icon={dishPhotoIcon}
                  disabled={!hasGenerationsLeft}
                />
              </div>

              <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-semibold text-slate-800">Transformar Sobras</h3>
                <p className="mt-2 text-slate-500 h-12">Fotografe um prato que sobrou e descubra como transformá-lo.</p>
                <ImageUploader 
                  onImageUpload={handleLeftoversImageUpload}
                  multiple={false}
                  maxFiles={1}
                  uploadText="Envie foto das sobras"
                  uploadSubtext="(1 foto de um prato pronto)"
                  icon={leftoversIcon}
                  disabled={!hasGenerationsLeft}
                />
              </div>
              
              <button onClick={() => handleShowSettings('kitchen')} className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 hover:bg-orange-50 transition-colors">
                <h3 className="text-2xl font-semibold text-slate-800">Cadastrar Minha Cozinha</h3>
                <p className="mt-2 text-slate-500 h-12">Informe seus equipamentos (airfryer, panela de pressão) e receba receitas perfeitamente adaptadas.</p>
                 <div className="mt-8 flex justify-center rounded-xl border border-slate-300 bg-white px-6 py-10 w-full">
                    <div className="text-center">
                      {kitchenIcon}
                       <div className="mt-4 text-sm leading-6 text-slate-600">
                         <p>
                            <span className="font-semibold text-orange-600">
                                Personalizar equipamentos
                            </span>
                         </p>
                      </div>
                      <p className="text-xs leading-5 text-slate-500">Receitas mais precisas</p>
                    </div>
                </div>
              </button>
            </div>
            
            <div className="relative my-2 w-full max-w-4xl">
              <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-300" /></div>
              <div className="relative flex justify-center"><span className="bg-slate-100 px-3 text-base font-medium text-slate-500">OU</span></div>
            </div>

            <div className="w-full max-w-2xl">
              <ManualIngredientInput
                  ingredients={manualIngredients}
                  onAddIngredient={handleAddManualIngredient}
                  onRemoveIngredient={handleRemoveManualIngredient}
                  disabled={!hasGenerationsLeft}
              />
               <div className="mt-8 text-center">
                  <button
                      onClick={handleManualSubmit}
                      disabled={manualIngredients.length === 0 || !hasGenerationsLeft}
                      className="w-full sm:w-auto px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-800 shadow-sm hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {!hasGenerationsLeft ? 'Limite diário atingido' : 'Buscar Receitas'}
                  </button>
              </div>
            </div>

            {error && <p className="mt-4 text-center text-red-500">{error}</p>}
          </>
        );
      case AppState.ANALYZING:
        return <LoadingView />;
      case AppState.SHOWING_RESULTS:
        return (
          <ResultsView
            appMode={appMode}
            imageUrls={previewUrls}
            ingredients={ingredients}
            selectedIngredients={selectedIngredients}
            onSelectedIngredientsChange={setSelectedIngredients}
            ingredientsForCurrentRecipes={ingredientsForCurrentRecipes}
            
            recipes={recipes}
            marketRecipes={marketRecipes}
            weeklyPlan={weeklyPlan}
            resultsMode={resultsMode}
            onResultsModeChange={setResultsMode}
            onFetchMarketRecipes={handleFetchMarketRecipes}
            isFetchingMarketRecipes={isFetchingMarketRecipes}
            onFetchWeeklyPlan={handleFetchWeeklyPlan}
            isFetchingWeeklyPlan={isFetchingWeeklyPlan}

            onReset={handleReset}
            onRegenerate={regenerateRecipes}
            onAddIngredient={handleAddIngredient}
            onRemoveIngredient={handleRemoveIngredient}
            isRegenerating={isRegeneratingRecipes}
            onMoreRecipes={handleMoreRecipes}
            isFetchingMore={isFetchingMore}
            savedRecipes={savedRecipes}
            onToggleSave={handleToggleSaveRecipe}
            onViewRecipe={setSelectedRecipe}
            onRemoveRecipe={handleRemoveRecipe}
            onReplaceRecipe={handleReplaceRecipe}
            replacingRecipeIndex={replacingRecipeIndex}

            userSettings={userSettings}
            onShowSettings={() => handleShowSettings()}
            onDismissFlavorProfilePrompt={handleDismissFlavorProfilePrompt}

            selectedMealTypes={selectedMealTypes}
            onSelectedMealTypesChange={setSelectedMealTypes}
            effortFilters={effortFilters}
            onEffortFiltersChange={setEffortFilters}
            error={error}
            hasGenerationsLeft={hasGenerationsLeft}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col font-sans">
        <Header 
          onShowSaved={() => setIsSavedModalOpen(true)} 
          savedRecipesCount={savedRecipes.length}
          onShowSettings={() => handleShowSettings()}
          remainingGenerations={remainingGenerations}
          userPlan={userSettings.plan}
        />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
              {renderContent()}
          </div>
        </main>
        <Footer />

        {selectedRecipe && (
          <RecipeModal 
              recipe={selectedRecipe} 
              onClose={() => setSelectedRecipe(null)} 
              isSaved={savedRecipes.some(r => r.id === selectedRecipe.id)}
              onToggleSave={handleToggleSaveRecipe}
              onUpdateRecipe={handleUpdateSavedRecipe}
          />
        )}
        
        <SavedRecipesModal
          isOpen={isSavedModalOpen}
          onClose={() => setIsSavedModalOpen(false)}
          savedRecipes={savedRecipes}
          onToggleSave={handleToggleSaveRecipe}
          onViewRecipe={(recipe) => {
            setIsSavedModalOpen(false);
            setSelectedRecipe(recipe);
          }}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={userSettings}
          onSave={setUserSettings}
          initialTab={initialSettingsTab}
        />

        <UpgradeModal 
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
        />
      </div>
    </AuthProvider>
  );
};

export default App;