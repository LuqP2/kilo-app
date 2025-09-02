import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Ingredient, Technique } from '../types';
import { adjustRecipeServings, getAnswerForRecipeQuestion, getTechniqueExplanation } from '../services/geminiService';
import { useAuth } from '../AuthContext';
import { db } from '../firebaseConfig';
import { setDoc, deleteDoc, doc } from 'firebase/firestore';
import { signInWithGoogle } from '../services/authService';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (recipe: Recipe) => void;
  onUpdateRecipe: (recipeId: string, updates: Partial<Recipe>) => void;
}

interface Timer {
    id: number;
    initialDuration: number;
    timeLeft: number;
    isRunning: boolean;
}

const formatIngredient = (ing: Ingredient): string => {
    const { name, quantity, unit } = ing;

    const formattedName = name?.trim() || '';
    const formattedQuantity = quantity?.trim().toLowerCase() || '';
    const formattedUnit = unit?.trim().toLowerCase() || '';
    
    if (!formattedQuantity || isNaN(parseFloat(formattedQuantity))) {
        return `${formattedName.charAt(0).toUpperCase() + formattedName.slice(1)} ${formattedQuantity}`;
    }

    if (!formattedUnit || formattedUnit.startsWith('unidade')) {
        return `${formattedQuantity} ${formattedName}`;
    }

    return `${formattedQuantity} ${formattedUnit} de ${formattedName}`;
};

const RecipeModal: React.FC<RecipeModalProps> = ({ recipe: initialRecipe, onClose, isSaved, onToggleSave, onUpdateRecipe }) => {
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [servingsValue, setServingsValue] = useState<string>(initialRecipe.servings?.toString() ?? '1');

  const [isKitchenMode, setIsKitchenMode] = useState(false);
  const [timers, setTimers] = useState<Timer[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [shoppingListChecked, setShoppingListChecked] = useState<string[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(initialRecipe);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);

  const [activeTechnique, setActiveTechnique] = useState<Technique | null>(null);
  const [techniqueSteps, setTechniqueSteps] = useState<string[]>([]);
  const [isLoadingTechnique, setIsLoadingTechnique] = useState(false);

  const { currentUser } = useAuth();

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  useEffect(() => {
    setRecipe(initialRecipe);
    setEditedRecipe(initialRecipe);
    setIsEditing(false);
    setTimers([]); // Reset timers when recipe changes
    setExpandedQuestion(null); // Reset questions when recipe changes
    setAnswers({});
    setActiveTechnique(null);
  }, [initialRecipe]);

  // Keep the input in sync with the recipe state from the prop or API updates
  useEffect(() => {
    setServingsValue(recipe.servings?.toString() ?? '1');
  }, [recipe.servings]);
  
  // Timer tick effect
  useEffect(() => {
    if (timers.length === 0) return;
    
    const interval = setInterval(() => {
      setTimers(prevTimers => {
        let shouldPlaySound = false;
        const newTimers = prevTimers.map(timer => {
          if (timer.isRunning && timer.timeLeft > 0) {
            const newTimeLeft = timer.timeLeft - 1;
            if (newTimeLeft === 0) {
              shouldPlaySound = true;
            }
            return { ...timer, timeLeft: newTimeLeft, isRunning: newTimeLeft > 0 ? timer.isRunning : false };
          }
          return timer;
        });

        if (shouldPlaySound && audioRef.current) {
          audioRef.current.play();
        }
        return newTimers;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timers]);
  
  const handleServingsChange = async (newServingsRaw: number | string) => {
    const newServings = typeof newServingsRaw === 'string' ? parseInt(newServingsRaw, 10) : newServingsRaw;
    const originalServings = initialRecipe.servings;

    if (isNaN(newServings) || newServings < 1 || !originalServings) {
        // If invalid input, reset input to current valid state
        setServingsValue(recipe.servings?.toString() ?? '1');
        return;
    }
    
    if (newServings === recipe.servings) return; // No change needed

    // If user wants to go back to original, just reset the recipe state to the initial prop
    if (newServings === initialRecipe.servings) {
        setRecipe(initialRecipe);
        return;
    }

    setIsAdjusting(true);
    try {
        const isMarket = !!(initialRecipe.ingredientsYouHave || initialRecipe.ingredientsToBuy);
        let adjustedRecipeParts: Partial<Recipe>;

        if (isMarket) {
            const adjustedToBuy = await adjustRecipeServings(initialRecipe.ingredientsToBuy || [], originalServings, newServings);
            adjustedRecipeParts = {
                servings: newServings,
                ingredientsYouHave: initialRecipe.ingredientsYouHave,
                ingredientsToBuy: adjustedToBuy
            };
        } else {
            const adjustedNeeded = await adjustRecipeServings(initialRecipe.ingredientsNeeded || [], originalServings, newServings);
            adjustedRecipeParts = {
                servings: newServings,
                ingredientsNeeded: adjustedNeeded
            };
        }
        setRecipe(prev => ({ ...prev, ...adjustedRecipeParts }));

    } catch (error) {
        console.error("Failed to adjust servings", error);
        alert("Não foi possível ajustar as porções. Tente novamente.");
        // Revert recipe state to what it was before the attempt
        setServingsValue(recipe.servings?.toString() ?? '1');
    } finally {
        setIsAdjusting(false);
    }
  };

  const handleToggleShoppingItem = (itemName: string) => {
    setShoppingListChecked(prev => 
      prev.includes(itemName) ? prev.filter(i => i !== itemName) : [...prev, itemName]
    );
  };

  const handleSave = () => {
    onUpdateRecipe(editedRecipe.id, editedRecipe);
    setIsEditing(false);
  };
  const handleCancel = () => {
    setEditedRecipe(initialRecipe);
    setIsEditing(false);
  };
  const handleFieldChange = (field: keyof Recipe, value: string) => {
    setEditedRecipe(prev => ({...prev, [field]: value}));
  };
  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string, listKey: 'ingredientsNeeded' | 'ingredientsYouHave' | 'ingredientsToBuy') => {
    setEditedRecipe(prev => {
      const newList = [...(prev[listKey] as Ingredient[] || [])];
      newList[index] = {...newList[index], [field]: value};
      return {...prev, [listKey]: newList};
    });
  };
  const handleAddIngredient = (listKey: 'ingredientsNeeded' | 'ingredientsYouHave' | 'ingredientsToBuy') => {
    setEditedRecipe(prev => {
        const newList = [...(prev[listKey] as Ingredient[] || []), { name: '', quantity: '', unit: '' }];
        return {...prev, [listKey]: newList};
    });
  };
  const handleRemoveIngredient = (index: number, listKey: 'ingredientsNeeded' | 'ingredientsYouHave' | 'ingredientsToBuy') => {
    setEditedRecipe(prev => {
        const newList = [...(prev[listKey] as Ingredient[] || [])];
        newList.splice(index, 1);
        return {...prev, [listKey]: newList};
    });
  };
  const handleStepChange = (index: number, value: string) => {
    setEditedRecipe(prev => {
      const newSteps = [...(prev.howToPrepare || [])];
      newSteps[index] = value;
      return {...prev, howToPrepare: newSteps};
    });
  };
  const handleAddStep = () => {
    setEditedRecipe(prev => ({...prev, howToPrepare: [...(prev.howToPrepare || []), '']}));
  };
  const handleRemoveStep = (index: number) => {
    setEditedRecipe(prev => {
        const newSteps = [...(prev.howToPrepare || [])];
        newSteps.splice(index, 1);
        return {...prev, howToPrepare: newSteps};
    });
  };

    
  // Handle both string (old format) and string[] (new format) for backward compatibility
  const preparationSteps = Array.isArray(recipe.howToPrepare) 
    ? recipe.howToPrepare.filter(step => step.trim() !== '') 
    : String(recipe.howToPrepare)
        .split('\n')
        .flatMap(line => line.split(/\s*(?=[1-9]\d*\.\s)/))
        .map(step => step.trim().replace(/^[1-9]\d*\.\s*/, ''))
        .filter(step => step.trim() !== '');
    
  // --- Timer Logic ---
  const timeRegex = /(\d+(?:[.,]\d+)?)\s*(minuto|minutos|min|hora|horas|h)\b/gi;
  const parseTimeToSeconds = (value: string, unit: string): number => {
    const num = parseFloat(value.replace(',', '.'));
    const lowerUnit = unit.toLowerCase();
    if (lowerUnit.startsWith('min')) return num * 60;
    if (lowerUnit.startsWith('h')) return num * 3600;
    return 0;
  };
  const formatTime = (seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const startTimer = (durationInSeconds: number) => {
    setTimers(prev => [...prev, { id: Date.now(), initialDuration: durationInSeconds, timeLeft: durationInSeconds, isRunning: true }]);
  };
  
  const toggleTimer = (id: number) => setTimers(prev => prev.map(t => t.id === id && t.timeLeft > 0 ? { ...t, isRunning: !t.isRunning } : t));
  const removeTimer = (id: number) => setTimers(prev => prev.filter(t => t.id !== id));
  
  const handleTechniqueClick = async (technique: Technique) => {
    if (activeTechnique?.term === technique.term) {
        setActiveTechnique(null);
        return;
    }
    setActiveTechnique(technique);
    setIsLoadingTechnique(true);
    setTechniqueSteps([]);
    try {
        const steps = await getTechniqueExplanation(technique.term);
        setTechniqueSteps(steps);
    } catch (e) {
        console.error("Failed to get technique explanation", e);
        setTechniqueSteps(["Desculpe, não foi possível carregar a explicação."]);
    } finally {
        setIsLoadingTechnique(false);
    }
  };
  
  const renderStepContent = (step: string) => {
    // Sort techniques by length descending to match longer phrases first
    const sortedTechniques = recipe.techniques?.sort((a, b) => b.term.length - a.term.length) || [];

    if (sortedTechniques.length === 0) {
      // Fallback to only timer logic if no techniques are present
      const parts: (string | JSX.Element)[] = [];
      let lastIndex = 0;
      let match;
      while ((match = timeRegex.exec(step)) !== null) {
        parts.push(step.slice(lastIndex, match.index));
        const duration = parseTimeToSeconds(match[1], match[2]);
        parts.push(
            <button key={match.index} onClick={() => startTimer(duration)} className="mx-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            {match[0]}
            </button>
        );
        lastIndex = match.index + match[0].length;
      }
      parts.push(step.slice(lastIndex));
      return <p className="ml-3 leading-relaxed">{parts}</p>;
    }
    
    const techniqueTerms = sortedTechniques.map(t => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const allTermsRegex = new RegExp(`(${techniqueTerms.join('|')})`, 'gi');

    const parts = step.split(allTermsRegex);

    return (
        <p className="ml-3 leading-relaxed">
            {parts.map((part, index) => {
                const technique = sortedTechniques.find(t => t.term.toLowerCase() === part.toLowerCase());
                if (technique) {
                    return (
                        <button
                            key={`${index}-technique`}
                            onClick={() => handleTechniqueClick(technique)}
                            className="mx-1 font-semibold underline decoration-orange-400 decoration-2 underline-offset-2 text-orange-600 hover:bg-orange-100 rounded px-1 py-0.5 transition-colors"
                        >
                            {part}
                        </button>
                    );
                }

                // If not a technique, process for timers
                const timerParts: (string | JSX.Element)[] = [];
                let lastIndex = 0;
                let match;
                // Important: create a new regex instance for each part as the global flag is stateful
                const localTimeRegex = new RegExp(timeRegex);
                while ((match = localTimeRegex.exec(part)) !== null) {
                    timerParts.push(part.slice(lastIndex, match.index));
                    const duration = parseTimeToSeconds(match[1], match[2]);
                    timerParts.push(
                        <button
                            key={`${index}-${match.index}-timer`}
                            onClick={() => startTimer(duration)}
                            className="mx-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            {match[0]}
                        </button>
                    );
                    lastIndex = match.index + match[0].length;
                }
                timerParts.push(part.slice(lastIndex));
                
                return <React.Fragment key={`${index}-text`}>{timerParts}</React.Fragment>;
            })}
        </p>
    );
  };


  const handleQuestionToggle = async (question: string) => {
    if (expandedQuestion === question) {
      setExpandedQuestion(null);
      return;
    }

    setExpandedQuestion(question);

    if (!answers[question]) { // Fetch only if not already fetched
      setLoadingQuestion(question);
      try {
        const answer = await getAnswerForRecipeQuestion(recipe.recipeName, preparationSteps, question);
        setAnswers(prev => ({ ...prev, [question]: answer }));
      } catch (error) {
        console.error("Failed to get answer:", error);
        setAnswers(prev => ({ ...prev, [question]: "Desculpe, não foi possível carregar a resposta. Tente novamente." }));
      } finally {
        setLoadingQuestion(null);
      }
    }
  };
  
  const isMarketMode = !!(recipe.ingredientsYouHave || recipe.ingredientsToBuy);

  if (isKitchenMode) {
    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="flex-shrink-0 flex justify-between items-center mb-4">
                <h3 className="text-2xl sm:text-3xl font-bold text-orange-700">{recipe.recipeName}</h3>
                <button onClick={() => setIsKitchenMode(false)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Sair do Modo Cozinha</button>
            </div>
            {timers.length > 0 && (
                <div className="flex-shrink-0 mb-4 p-4 bg-slate-100 rounded-lg space-y-3">
                    {timers.map(timer => (
                        <div key={timer.id} className="flex items-center justify-between">
                            <span className={`font-mono text-xl ${timer.timeLeft === 0 ? 'text-green-600' : 'text-slate-800'}`}>{formatTime(timer.timeLeft)}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleTimer(timer.id)} className="text-slate-500 hover:text-slate-800">
                                    {timer.isRunning ? 
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 002 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> : 
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                    }
                                </button>
                                <button onClick={() => removeTimer(timer.id)} className="text-slate-500 hover:text-red-600">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="overflow-y-auto text-lg text-slate-800 space-y-6">
                 {preparationSteps.map((step, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 font-bold">
                        {index + 1}
                      </div>
                      <div className="ml-4 leading-relaxed">{renderStepContent(step)}</div>
                    </div>
                  ))}
            </div>
        </div>
    );
  }

  const handleToggleSaveFirestore = async (recipe: Recipe) => {
    if (!currentUser) {
      await signInWithGoogle();
      return;
    }
    const recipeRef = doc(db, 'users', currentUser.uid, 'savedRecipes', recipe.id);
    try {
      if (!isSaved) {
        await setDoc(recipeRef, recipe);
      } else {
        await deleteDoc(recipeRef);
      }
      onToggleSave(recipe); // Mantém sincronização local
    } catch (e) {
      console.error("Erro ao salvar/remover receita no Firestore", e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-0 sm:p-4 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT19PAAAAAAAC//8=/" />
        <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:w-full sm:max-w-2xl sm:h-auto sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 md:p-8 border-b border-slate-200 flex-shrink-0">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                        {isEditing ? (
                            <input type="text" value={editedRecipe.recipeName} onChange={e => handleFieldChange('recipeName', e.target.value)} className="text-2xl font-bold text-orange-700 w-full border-b-2 border-orange-200 focus:border-orange-500 outline-none bg-transparent" />
                        ) : (
                            <h3 className="text-2xl font-bold text-orange-700">{recipe.recipeName}</h3>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleSaveFirestore(recipe)}
                          className="text-slate-400 hover:text-orange-500"
                          aria-label={isSaved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" className={isSaved ? "text-orange-500" : ""} />
                          </svg>
                        </button>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-slate-600" aria-label="Editar receita">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar modal"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
                {isEditing ? (
                   <textarea value={editedRecipe.description} onChange={e => handleFieldChange('description', e.target.value)} rows={2} className="mt-2 text-slate-700 w-full border-b-2 border-orange-200 focus:border-orange-500 outline-none bg-transparent resize-none" />
                ) : (
                    <>
                        <p className="mt-2 text-gray-600">{recipe.description}</p>
                        {(recipe.calories || recipe.servings) && (
                            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                                {recipe.servings && (
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                           <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                        </svg>
                                        <span>Serve <strong className="font-semibold text-slate-800">{recipe.servings}</strong></span>
                                    </div>
                                )}
                                {recipe.calories && (
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934l-.546 1.073a1 1 0 001.24 1.45l.546-1.073a.5.5 0 01.725-.192l.546 1.073a1 1 0 001.24-1.45l-.546-1.073a.5.5 0 01.385-.725l.243.485a1 1 0 001.24-1.45l-.243-.485a.5.5 0 01.614-.558 1 1 0 00.385-1.45c-.23-.345-.558-.614-.934-.822l-1.073-.546zM9 4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM3 10a1 1 0 011-1h.01a1 1 0 110 2H4a1 1 0 01-1-1zM7 16a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zM12 10a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1zM9 14a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span><strong className="font-semibold text-slate-800">{recipe.calories}</strong> kcal / porção</span>
                                    </div>
                                )}
                                {recipe.totalTime && (
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                        <span><strong className="font-semibold text-slate-800">{recipe.totalTime}</strong> min</span>
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
                    </>
                )}
            </div>
            <div className="p-6 md:p-8 overflow-y-auto">
                {/* Portions and Ingredients */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h4 className="text-lg font-semibold text-gray-800">Ingredientes:</h4>
                   {recipe.servings && !isEditing && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="servings-input" className="text-sm font-semibold text-orange-600">Porções:</label>
                        <div className="flex items-center gap-1">
                             <button onClick={() => handleServingsChange((recipe.servings || 1) - 1)} disabled={isAdjusting || (recipe.servings || 1) <= 1} className="h-7 w-7 rounded-full border border-slate-300 text-slate-600 disabled:opacity-50 flex items-center justify-center">-</button>
                             <input
                                id="servings-input"
                                type="number"
                                min="1"
                                value={servingsValue}
                                onChange={e => setServingsValue(e.target.value)}
                                onBlur={() => handleServingsChange(servingsValue)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        handleServingsChange(servingsValue);
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className={`font-semibold bg-slate-800 text-white w-12 text-center border border-slate-300 rounded-md py-1 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 ${isAdjusting ? 'animate-pulse' : ''}`}
                                disabled={isAdjusting}
                                aria-label="Número de porções"
                             />
                             <button onClick={() => handleServingsChange((recipe.servings || 1) + 1)} disabled={isAdjusting} className="h-7 w-7 rounded-full border border-slate-300 text-slate-600 disabled:opacity-50 flex items-center justify-center">+</button>
                        </div>
                    </div>
                   )}
                </div>
                <div className={`${isAdjusting ? 'opacity-50 transition-opacity' : ''}`}>
                    {isMarketMode ? (
                        <>
                            <div className="mt-4">
                                <h5 className="font-semibold text-gray-800 flex items-center gap-2"><span role="img" aria-label="check mark">✅</span> Você já tem:</h5>
                                <ul className="mt-2 space-y-2">{recipe.ingredientsYouHave?.map((ing, i) => (<li key={i} className="flex items-start"><span className="text-orange-500 mr-3 mt-1 flex-shrink-0">&#8226;</span><span className="text-gray-700 capitalize">{formatIngredient(ing)}</span></li>))}</ul>
                            </div>
                            <div className="mt-6">
                                <h5 className="font-semibold text-gray-800 flex items-center gap-2"><span role="img" aria-label="shopping cart">🛒</span> Lista de Compras:</h5>
                                <ul className="mt-2 space-y-2">{recipe.ingredientsToBuy?.map((ing, i) => { const isChecked = shoppingListChecked.includes(ing.name); return ( <li key={i}><label className="flex items-center cursor-pointer"><input type="checkbox" checked={isChecked} onChange={() => handleToggleShoppingItem(ing.name)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500" /><span className={`ml-3 text-gray-700 capitalize transition-colors ${isChecked ? 'line-through text-gray-400' : ''}`}>{formatIngredient(ing)}</span></label></li>)})}</ul>
                            </div>
                        </>
                    ) : (
                        <ul className="mt-4 space-y-2">
                          {(isEditing ? editedRecipe.ingredientsNeeded : recipe.ingredientsNeeded)?.map((ing, i) => (
                          <li key={i} className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <input type="text" placeholder="Qtd" value={ing.quantity} onChange={(e) => handleIngredientChange(i, 'quantity', e.target.value, 'ingredientsNeeded')} className="w-16 p-1 border border-slate-300 rounded bg-slate-800 text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm" />
                                <input type="text" placeholder="Unid." value={ing.unit} onChange={(e) => handleIngredientChange(i, 'unit', e.target.value, 'ingredientsNeeded')} className="w-24 p-1 border border-slate-300 rounded bg-slate-800 text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm" />
                                <input type="text" placeholder="Nome" value={ing.name} onChange={(e) => handleIngredientChange(i, 'name', e.target.value, 'ingredientsNeeded')} className="flex-grow p-1 border border-slate-300 rounded bg-slate-800 text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm" />
                                <button onClick={() => handleRemoveIngredient(i, 'ingredientsNeeded')} className="flex-shrink-0 h-8 w-8 rounded-full inline-flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-600" aria-label={`Remover ingrediente`}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                              </>
                            ) : (
                              <><span className="text-orange-500 mr-3 mt-1 flex-shrink-0">&#8226;</span><span className="text-gray-700 capitalize">{formatIngredient(ing)}</span></>
                            )}
                          </li>
                          ))}
                          {isEditing && <button onClick={() => handleAddIngredient('ingredientsNeeded')} className="mt-2 text-sm text-orange-600 font-semibold">+ Adicionar Ingrediente</button>}
                        </ul>
                    )}
                </div>
                
                {/* Preparation */}
                <div className="mt-6">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-gray-800">Modo de Preparo:</h4>
                        {!isEditing && <button onClick={() => setIsKitchenMode(true)} className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700">Iniciar Modo Cozinha</button>}
                    </div>
                    <div className="mt-3 space-y-4 text-gray-700">
                        {(isEditing ? editedRecipe.howToPrepare : preparationSteps).map((step, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">{index + 1}</div>
                                {isEditing ? (
                                    <>
                                        <textarea value={step} onChange={(e) => handleStepChange(index, e.target.value)} rows={2} className="flex-grow p-1 border border-slate-300 rounded w-full resize-none bg-slate-800 text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm" />
                                        <button onClick={() => handleRemoveStep(index)} className="flex-shrink-0 h-8 w-8 rounded-full inline-flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-600" aria-label={`Remover passo ${index + 1}`}>
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </>
                                ) : (
                                    renderStepContent(step)
                                )}
                            </div>
                        ))}
                         {isEditing && <button onClick={handleAddStep} className="mt-2 text-sm text-orange-600 font-semibold">+ Adicionar Passo</button>}
                    </div>
                </div>

                {/* Common Questions */}
                {recipe.commonQuestions && recipe.commonQuestions.length > 0 && !isEditing && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="text-lg font-semibold text-gray-800">Dúvidas Comuns</h4>
                    <div className="mt-3 space-y-2">
                      {recipe.commonQuestions.map((question, index) => (
                        <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleQuestionToggle(question)}
                            className="w-full flex justify-between items-center text-left p-4 hover:bg-slate-50 focus:outline-none focus:bg-slate-100 transition-colors"
                            aria-expanded={expandedQuestion === question}
                          >
                            <span className="font-medium text-slate-700">{question}</span>
                            <svg className={`h-5 w-5 text-slate-500 transform transition-transform ${expandedQuestion === question ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {expandedQuestion === question && (
                            <div className="p-4 border-t border-slate-200 bg-slate-50/75">
                              {loadingQuestion === question ? (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span>Buscando resposta...</span>
                                </div>
                              ) : (
                                <p className="text-slate-600 whitespace-pre-wrap">{answers[question]}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
             {isEditing && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">Salvar Alterações</button>
                </div>
            )}
            
            {activeTechnique && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 p-6 md:p-8 flex flex-col" onClick={() => setActiveTechnique(null)}>
                    <div className="w-full max-w-lg m-auto bg-white rounded-xl shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-start">
                            <div>
                            <h4 className="text-xl font-bold text-orange-700">{activeTechnique.term}</h4>
                            <p className="text-slate-500 mt-1">{activeTechnique.description}</p>
                            </div>
                            <button onClick={() => setActiveTechnique(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fechar tutorial"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    </div>
                    <div className="p-6 max-h-[50vh] overflow-y-auto">
                        {isLoadingTechnique ? (
                        <div className="flex items-center justify-center h-24">
                            <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </div>
                        ) : (
                        <div className="space-y-3 text-slate-700 prose prose-orange">
                            {techniqueSteps.map((step, index) => (
                                <p key={index}>{step.replace(/^\d+\.\s*/, '')}</p>
                            ))}
                        </div>
                        )}
                    </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default RecipeModal;
