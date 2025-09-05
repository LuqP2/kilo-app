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
import LoginScreen from './components/LoginScreen';
import BottomNavigation from './components/BottomNavigation';

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
  const { userProfile, updateUserProfile, currentUser, loading } = useAuth();
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
  const [currentBottomNavView, setCurrentBottomNavView] = useState<'home' | 'recipes' | 'planning' | 'settings'>('home');
  // Guard: when auth.loading hangs, allow falling back to LoginScreen after a short timeout
  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  
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
    const remaining = getRemainingGenerations(userProfile?.isPro || false);
    setRemainingGenerations(remaining);
  }, [userProfile]);

  // Diagnostic: trace appState transitions and important triggers
  useEffect(() => {
    console.debug(`[App] appState changed -> ${appState}`);
    if (appState === AppState.ANALYZING) {
      // Helpful stack trace to locate the caller
      console.trace('[App] ANALYZING entered');
    }
  }, [appState]);

  // Diagnostic: auth state
  useEffect(() => {
    console.debug('[App] auth state ->', { loading, currentUserId: currentUser ? currentUser.uid : null });
    console.debug('[App] auth state details ->', { loading, hasCurrentUser: !!currentUser, authTimeoutExpired });
  }, [loading, currentUser, authTimeoutExpired]);

  // If auth.loading stays true for too long, allow showing the login screen so the UI isn't stuck.
  // Do not fallback if a user has already been set.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    
    if (currentUser) {
      // User logged in — ensure fallback is disabled
      console.debug('[App] User detected, clearing auth timeout');
      setAuthTimeoutExpired(false);
      return;
    }

    // Also cancel timeout if loading is false (auth resolved)
    if (!loading) {
      console.debug('[App] Auth resolved, clearing timeout');
      setAuthTimeoutExpired(false);
      return;
    }

    if (loading) {
      console.debug('[App] Auth loading, setting 8s timeout');
      setAuthTimeoutExpired(false);
      t = setTimeout(() => {
        console.debug('[App] auth loading timeout expired, falling back to login screen');
        setAuthTimeoutExpired(true);
      }, 8000); // Increased to 8 seconds
    }

    return () => {
      if (t) {
        console.debug('[App] Clearing auth timeout');
        clearTimeout(t);
      }
    };
  }, [loading, currentUser]);

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
  console.debug('[App] startInitialSearch called with', searchIngredients);
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

  console.debug('[App] handleUnifiedImageUpload called with files:', files.map(f => f.name));

    // Centralized usage check: only decrement on the three primary generation actions
    try {
      checkAndIncrementUsage(userProfile?.isPro || false);
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
  }, [userSettings, startInitialSearch, updateUsageCount, userProfile]);

  const handleLeftoversImageUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];

  console.debug('[App] handleLeftoversImageUpload called with file:', file.name);

    // Centralized usage check
    try {
      checkAndIncrementUsage(userProfile?.isPro || false);
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
  }, [userSettings, updateUsageCount, userProfile]);

  const handleManualSubmit = useCallback(async () => {
    if (manualIngredients.length === 0) return;
    setImageFiles([]);
    setPreviewUrls([]);
    setAppMode(AppMode.INGREDIENTS);
    // Centralized usage check
    try {
      checkAndIncrementUsage(userProfile?.isPro || false);
    } catch (e) {
      handleApiError(e);
      return;
    }

    await startInitialSearch(manualIngredients);
  }, [manualIngredients, startInitialSearch, userProfile]);


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

  const handleBottomNavigation = (view: 'home' | 'recipes' | 'planning' | 'settings') => {
    setCurrentBottomNavView(view);
    
    switch (view) {
      case 'home':
        setAppState(AppState.IDLE);
        setSelectedRecipe(null);
        setIsSavedModalOpen(false);
        setIsSettingsModalOpen(false);
        break;
      case 'recipes':
        setIsSavedModalOpen(true);
        break;
      case 'planning':
        setIsSettingsModalOpen(true);
        setInitialSettingsTab('preferences');
        // Pode ser expandido para uma tela específica de planejamento no futuro
        break;
      case 'settings':
        setIsSettingsModalOpen(true);
        setInitialSettingsTab('preferences');
        break;
    }
  };

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

  const handleSaveSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      // Salva no estado local e localStorage primeiro
      setUserSettings(newSettings);
      
      // Se há equipamentos de cozinha, atualiza o perfil do usuário com validação
      if (newSettings.kitchenEquipment && newSettings.kitchenEquipment.length > 0) {
        await updateUserProfile({
          myKitchen: {
            appliances: newSettings.kitchenEquipment.filter(item => 
              ['Airfryer', 'Panela de Pressão', 'Micro-ondas', 'Liquidificador', 'Batedeira', 'Forno'].includes(item)
            ),
            utensils: newSettings.kitchenEquipment.filter(item => 
              !['Airfryer', 'Panela de Pressão', 'Micro-ondas', 'Liquidificador', 'Batedeira', 'Forno'].includes(item)
            )
          }
        });
      }
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      // Re-throw para o SettingsModal tratar o erro
      throw new Error(error.message || 'Erro ao salvar as configurações');
    }
  }, [updateUserProfile]);

  const hasAccess = userProfile?.isPro || (FREE_PLAN_LIMIT - (userProfile?.generationsUsed || 0)) > 0;

  const renderContent = () => {
    console.debug('[App] renderContent called', { loading, currentUser: !!currentUser, authTimeoutExpired });
    
    // While auth is resolving show LoadingView, but if it hangs, fall back to LoginScreen
    if (loading && !authTimeoutExpired) {
      console.debug('[App] Showing LoadingView');
      return <LoadingView />;
    }

    // Only show LoginScreen when there's no user. The timeout fallback should not override an active user.
    if ((!loading && !currentUser) || (authTimeoutExpired && !currentUser)) {
      console.debug('[App] Showing LoginScreen');
      return <LoginScreen />;
    }

    console.debug('[App] Showing main content');

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
            {/* Header */}
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mb-4">O que vamos cozinhar hoje?</h2>
              <p className="text-lg sm:text-xl leading-relaxed text-gray-600">
                Filtre por tipo de refeição se desejar
              </p>
            </div>
            
            {/* Meal Type Selector - Pills */}
            <div className="w-full max-w-lg mb-12">
              <MealTypeSelector
                selectedMeals={selectedMealTypes}
                onChange={setSelectedMealTypes}
              />
            </div>

            {/* Main Camera Card - Destaque */}
            <div className="w-full max-w-md mb-12">
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                {/* Large Camera Icon */}
                <div className="mb-10">
                  <div className="mx-auto w-36 h-36 bg-orange-50 rounded-full flex items-center justify-center shadow-inner">
                    <svg className="w-20 h-20 text-[#FF7043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                
                {/* Main Title */}
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Fotografe sua geladeira</h3>
                <p className="text-gray-600 mb-10 leading-relaxed">Identifique seus ingredientes e receba receitas personalizadas na hora</p>
                
                {/* Main Camera Button */}
                <ImageUploader 
                  onImageUpload={handleUnifiedImageUpload}
                  multiple={true}
                  maxFiles={5}
                  uploadText="📸 Começar agora"
                  uploadSubtext=""
                  customButtonStyle="w-full bg-[#FF7043] hover:bg-[#e55d3a] text-white font-semibold py-6 px-10 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 text-lg"
                  disabled={!hasAccess}
                />
                
                {/* Manual Input Link */}
                <div className="mt-8">
                  <button 
                    onClick={() => document.getElementById('manual-input')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors font-medium"
                  >
                    Prefiro digitar os ingredientes
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Options */}
            <div className="w-full max-w-md space-y-6 mb-16">
              {/* Dish Photo Option */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <svg className="w-9 h-9 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zm3 8a3 3 0 100 6 3 3 0 000-6z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Que prato é esse?</h4>
                    <p className="text-sm text-gray-600">Descubra a receita fotografando um prato pronto</p>
                  </div>
                  <div className="flex-shrink-0">
                    <ImageUploader 
                      onImageUpload={handleUnifiedImageUpload}
                      multiple={false}
                      maxFiles={1}
                      uploadText="📷"
                      uploadSubtext=""
                      customButtonStyle="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-2xl border border-gray-300 transition-all duration-200 hover:shadow-md"
                      disabled={!hasAccess}
                    />
                  </div>
                </div>
              </div>

              {/* Leftovers Option */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-[#4CAF50] bg-opacity-10 rounded-2xl flex items-center justify-center">
                      <svg className="w-9 h-9 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Transformar sobras</h4>
                    <p className="text-sm text-gray-600">Reaproveite um prato que sobrou de forma criativa</p>
                  </div>
                  <div className="flex-shrink-0">
                    <ImageUploader 
                      onImageUpload={handleLeftoversImageUpload}
                      multiple={false}
                      maxFiles={1}
                      uploadText="🍽️"
                      uploadSubtext=""
                      customButtonStyle="bg-[#4CAF50] bg-opacity-10 hover:bg-[#4CAF50] hover:bg-opacity-20 text-[#4CAF50] font-semibold py-4 px-6 rounded-2xl border border-[#4CAF50] border-opacity-30 transition-all duration-200 hover:shadow-md"
                      disabled={!hasAccess}
                    />
                  </div>
                </div>
              </div>

              {/* Kitchen Setup Option */}
              <button 
                onClick={() => handleShowSettings('kitchen')} 
                className="w-full bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-lg hover:border-[#FF7043] hover:border-opacity-30 hover:bg-[#FF7043] hover:bg-opacity-5 transition-all duration-300"
              >
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <svg className="w-9 h-9 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM12 4v16M8 4v16M16 4v16" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Minha cozinha</h4>
                    <p className="text-sm text-gray-600">Configure seus equipamentos para receitas mais precisas</p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Manual Input Section */}
            <div id="manual-input" className="w-full max-w-lg">
              <div className="relative my-12">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#FAFAF5] px-8 py-3 text-sm font-medium text-gray-500 rounded-full">ou digite manualmente</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10">
                <ManualIngredientInput
                  ingredients={manualIngredients}
                  onAddIngredient={handleAddManualIngredient}
                  onRemoveIngredient={handleRemoveManualIngredient}
                  disabled={!hasAccess}
                />
                <div className="mt-10 text-center">
                  <button
                    onClick={handleManualSubmit}
                    disabled={manualIngredients.length === 0 || !hasAccess}
                    className="w-full sm:w-auto px-12 py-5 border border-transparent text-base font-semibold rounded-2xl text-white bg-[#FF7043] shadow-lg hover:bg-[#e55d3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7043] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl"
                  >
                    {!hasAccess ? 'Limite diário atingido' : 'Buscar Receitas'}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="mt-8 text-center text-red-500 bg-red-50 rounded-2xl p-6 border border-red-200">{error}</p>}
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
            hasGenerationsLeft={hasAccess}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FAFAF5] pb-20">
      <Header 
        onShowSaved={() => setIsSavedModalOpen(true)} 
        savedRecipesCount={savedRecipes.length}
        onShowSettings={() => handleShowSettings()}
      />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
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
        onSave={handleSaveSettings}
        initialTab={initialSettingsTab}
      />

      <UpgradeModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {/* Bottom Navigation - Fixed at bottom on mobile */}
      <BottomNavigation
        currentView={currentBottomNavView}
        onNavigate={handleBottomNavigation}
      />
    </div>
  );
};

export default App;