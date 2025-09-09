import React, { useState, useCallback, useEffect } from 'react';
import { Recipe, AppState, ResultsMode, WeeklyPlan, UserSettings, MealType, AppMode, Ingredient, EffortFilter } from './types';
import { identifyIngredients, getRecipeFromImage, suggestRecipes, suggestSingleRecipe, suggestMarketModeRecipes, generateWeeklyPlan, analyzeRecipeForProfile, classifyImage, suggestLeftoverRecipes, searchRecipeByName } from './services/geminiService';
import { getRemainingGenerations, FREE_PLAN_LIMIT, checkAndIncrementUsage } from './services/usageService';
import { compressMultipleImages, shouldCompressImage, isLowMemoryDevice, emergencyCompress } from './utils/imageUtils';
import { AuthProvider, useAuth } from './AuthContext';

import ImageUploader from './components/ImageUploader';
import LoadingView from './components/LoadingView';
import ResultsView from './components/ResultsView';
import Footer from './components/Footer';
import Header from './components/Header';
import SavedRecipesModal from './components/SavedRecipesModal';
import RecipeModal from './components/RecipeModal';
import ManualIngredientInput from './components/ManualIngredientInput';
import SettingsModal from './components/SettingsModal';
import MealTypeSelector from './components/MealTypeSelector';
import RegionLockMessage from './components/RegionLockMessage';
import UpgradeModal from './components/UpgradeModal';
import LoginScreen from './components/LoginScreen';
import BottomNavigation from './components/BottomNavigation';
import HomeScreen from './components/HomeScreen';
import RecipeDetailView from './components/RecipeDetailView';

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
  const [detailedRecipe, setDetailedRecipe] = useState<Recipe | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [resultsMode, setResultsMode] = useState<ResultsMode>(ResultsMode.USE_WHAT_I_HAVE);
  const [currentBottomNavView, setCurrentBottomNavView] = useState<'home' | 'recipes' | 'planning' | 'settings'>('home');
  // Guard: when auth.loading hangs, allow falling back to LoginScreen after a short timeout
  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isRegionLockedError, setIsRegionLockedError] = useState(false);
  const [isMemoryError, setIsMemoryError] = useState(false);
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
        } else if (e.message.includes('memory') || e.message.includes('memória') || e.message.includes('insuficiência')) {
          setError('Erro de memória detectado. Tente usar o modo de compressão máxima.');
          setIsMemoryError(true);
        } else {
          setError('Desculpe, ocorreu um erro. Tente novamente.');
        }
    } else {
      setError('Ocorreu um erro desconhecido.');
    }
  }

  const startInitialSearch = useCallback(async (searchIngredients: string[], mode: 'ingredients' | 'recipe' = 'ingredients') => {
    if (searchIngredients.length === 0) return;
  console.debug('[App] startInitialSearch called with', searchIngredients, 'mode:', mode);
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
        if (mode === 'recipe') {
          // Para busca por nome de receita, usar função específica
          const suggested = await searchRecipeByName(searchIngredients[0], userSettings, selectedMealTypes);
          if (suggested.length > 0) {
            setDetailedRecipe(addIdToRecipe(suggested[0]));
            setAppState(AppState.SHOWING_DETAILED_RECIPE);
          } else {
            setError('Nenhuma receita encontrada para esta busca.');
            setAppState(AppState.IDLE);
          }
        } else {
          // Para busca por ingredientes, usar função existente
          const suggested = await suggestRecipes(searchIngredients, [], userSettings, selectedMealTypes);
          setRecipes(addIdToRecipes(suggested));
          setAppState(AppState.SHOWING_RESULTS);
        }
        updateUsageCount();
      }
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

    setAppState(AppState.ANALYZING);
    setError(null);
    setIsRegionLockedError(false);
    setIsMemoryError(false);

    try {
      // Compress images to avoid memory issues on mobile devices
      // Large photos from phone cameras (4-8MB) can cause out-of-memory errors
      // when converted to Base64. This compression reduces size while preserving AI recognition quality.
      const isLowMemory = isLowMemoryDevice();
      console.debug(`[App] Device memory level: ${isLowMemory ? 'LOW' : 'NORMAL'}`);
      
      const filesToProcess = await Promise.all(
        files.map(async (file) => {
          if (shouldCompressImage(file, isLowMemory ? 400 : 800)) {
            console.debug(`[App] Compressing image: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
            
            try {
              // Use device-appropriate compression settings
              const compressionOptions = isLowMemory ? {
                maxWidth: 1280,
                maxHeight: 720,
                quality: 0.75,
                maxSizeKB: 400,
                preserveDetails: true // Still maintain quality for AI
              } : {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.85,
                maxSizeKB: 800,
                preserveDetails: true
              };
              
              return await compressMultipleImages([file], compressionOptions)
                .then(compressed => compressed[0]);
                
            } catch (compressionError) {
              console.warn('[App] Standard compression failed, trying emergency compression:', compressionError);
              // Fallback to emergency compression for extremely low-memory devices
              return await emergencyCompress(file);
            }
          }
          return file;
        })
      );

      setImageFiles(filesToProcess);
    
      // Reset results state
      setRecipes([]);
      setMarketRecipes([]);
      setWeeklyPlan(null);

      if (filesToProcess.length > 1) {
          setAppMode(AppMode.INGREDIENTS);
          const foundIngredients = await identifyIngredients(filesToProcess);
          updateUsageCount();
          await startInitialSearch(foundIngredients, 'ingredients');
      } else {
          const file = filesToProcess[0];
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
              const foundIngredients = await identifyIngredients(filesToProcess);
              updateUsageCount();
              await startInitialSearch(foundIngredients, 'ingredients');
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

    setAppState(AppState.ANALYZING);
    setError(null);
    setIsRegionLockedError(false);
    setIsMemoryError(false);
    setAppMode(AppMode.LEFTOVERS);

    try {
      // Compress image if needed to prevent mobile memory issues
      const isLowMemory = isLowMemoryDevice();
      const maxSizeKB = isLowMemory ? 400 : 800;
      
      const fileToProcess = shouldCompressImage(file, maxSizeKB) 
        ? await (async () => {
            try {
              return await compressMultipleImages([file], {
                maxWidth: isLowMemory ? 1280 : 1920,
                maxHeight: isLowMemory ? 720 : 1080,
                quality: isLowMemory ? 0.75 : 0.85,
                maxSizeKB: maxSizeKB,
                preserveDetails: true // Maintain quality for AI recognition
              }).then(compressed => compressed[0]);
            } catch (compressionError) {
              console.warn('[App] Standard compression failed for leftovers, trying emergency compression:', compressionError);
              return await emergencyCompress(file);
            }
          })()
        : file;

      setImageFiles([fileToProcess]);

      // Reset results state
      setRecipes([]);
      setMarketRecipes([]);
      setWeeklyPlan(null);

      const suggested = await suggestLeftoverRecipes(fileToProcess, userSettings);
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

    await startInitialSearch(manualIngredients, 'ingredients');
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
    switch (view) {
      case 'home':
        // Apenas o Home reseta o estado
        setCurrentBottomNavView(view);
        setAppState(AppState.IDLE);
        setSelectedRecipe(null);
        setIsSavedModalOpen(false);
        setIsSettingsModalOpen(false);
        // Reset para limpar qualquer estado anterior
        setRecipes([]);
        setMarketRecipes([]);
        setWeeklyPlan(null);
        setError(null);
        setIsRegionLockedError(false);
        break;
      case 'recipes':
        // Não muda currentBottomNavView, apenas abre o modal
        setIsSavedModalOpen(true);
        break;
      case 'planning':
        // Não muda currentBottomNavView, apenas abre o modal
        setIsSettingsModalOpen(true);
        setInitialSettingsTab('preferences');
        break;
      case 'settings':
        // Não muda currentBottomNavView, apenas abre o modal
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
    // Garantir que volta para a home da nova UI
    setCurrentBottomNavView('home');
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
        // Renderizar HomeScreen apenas no estado IDLE, independente do currentBottomNavView
        return (
          <HomeScreen
            onCameraClick={() => document.getElementById('card-file-input')?.click()}
            onKitchenClick={() => handleShowSettings('kitchen')}
            onInputSubmit={(ingredients, mode) => {
              // Handle unified input (array of ingredients) with mode
              setManualIngredients(ingredients);
              // Trigger recipe generation with the ingredients and mode
              startInitialSearch(ingredients, mode);
            }}
            onExit={() => {
              // Handle exit/logout functionality - just reset to initial state
              handleReset();
            }}
            isPro={userProfile?.isPro || false}
            remainingGenerations={remainingGenerations}
            onUpgradeClick={() => setIsUpgradeModalOpen(true)}
            error={error}
          />
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
      case AppState.SHOWING_DETAILED_RECIPE:
        return <RecipeDetailView recipe={detailedRecipe} onBack={handleReset} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FAFAF5]">
      {/* Header -- site-wide */}
      <Header
        hasGenerationsLeft={remainingGenerations > 0}
        generationsLeft={remainingGenerations}
        onShowSettings={() => handleShowSettings()}
        currentView={currentBottomNavView}
        onNavigate={handleBottomNavigation}
      />

      {/* Main content area */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
            {renderContent()}
        </div>
      </main>

      {/* Mobile bottom navigation only (hidden on md+) */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
        <BottomNavigation
          currentView={currentBottomNavView}
          onNavigate={handleBottomNavigation}
        />
      </div>

      {/* Modais sobrepostos com overlay semitransparente */}
      {(isSavedModalOpen || isSettingsModalOpen || isUpgradeModalOpen || selectedRecipe) && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-10">
          {/* Modais */}
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
            onClose={() => {
              setIsSavedModalOpen(false);
              // Não força volta ao home, mantém o estado atual
            }}
            savedRecipes={savedRecipes}
            onToggleSave={handleToggleSaveRecipe}
            onViewRecipe={(recipe) => {
              setIsSavedModalOpen(false);
              setSelectedRecipe(recipe);
            }}
          />
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => {
              setIsSettingsModalOpen(false);
              // Não força volta ao home, mantém o estado atual
            }}
            settings={userSettings}
            onSave={handleSaveSettings}
            initialTab={initialSettingsTab}
          />
          <UpgradeModal 
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
          />
        </div>
      )}

  {/* Footer: ensure it's a direct child of the root flex container so mt-auto works */}
  {appState !== AppState.IDLE && <Footer />}

  {/* Hidden file input for HomeScreen camera functionality */}
      <input 
        id="card-file-input" 
        type="file" 
        accept="image/*" 
        capture="environment"
        multiple 
        className="hidden" 
        onChange={(e) => { 
          const files = e.target.files ? Array.from(e.target.files) : []; 
          if (files.length) handleUnifiedImageUpload(files); 
          e.currentTarget.value = ''; 
        }} 
      />

    </div>
  );
};

export default App;