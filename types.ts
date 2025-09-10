export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface Technique {
  term: string;
  description: string;
}

export interface Recipe {
  id: string;
  recipeName: string;
  description: string;
  howToPrepare: string[];
  servings?: number;
  calories?: number;
  totalTime?: number;
  tags?: string[];
  commonQuestions?: string[];
  techniques?: Technique[];
  // For "Use what I have" mode
  ingredientsNeeded?: Ingredient[];
  // For "Market Mode"
  ingredientsYouHave?: Ingredient[];
  ingredientsToBuy?: Ingredient[];
}

export type MealType = 'Sobremesa' | 'Café da Manhã' | 'Almoço' | 'Jantar' | 'Lanche' | 'Acompanhamento';
export const MEAL_TYPES: MealType[] = ['Sobremesa', 'Café da Manhã', 'Almoço', 'Jantar', 'Lanche', 'Acompanhamento'];

export type EffortFilter = 'Rápido (-30 min)' | 'Uma Panela Só' | 'Sem Forno';

export interface DailyPlan {
  day: string;
  meals: {
    mealType: MealType;
    recipe: Recipe;
  }[];
}


export interface WeeklyPlan {
  shoppingList: Ingredient[];
  plan: DailyPlan[];
}

export type SpiceLevel = 'suave' | 'medio' | 'picante' | '';

export interface FlavorProfile {
  favoriteCuisines: string[];
  spiceLevel: SpiceLevel;
}

export interface UserSettings {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isFitMode: boolean;
  allergies: string;
  effortFilters: EffortFilter[];
  flavorProfile: FlavorProfile;
  kitchenEquipment: string[]; // Equipamentos de cozinha do usuário
  pantryStaples: string[]; // Temperos e itens básicos que o usuário sempre tem
  savedRecipeAnalysis: string[]; // Keywords learned from saved recipes
  flavorProfilePromptDismissed?: boolean;
  plan: 'free' | 'pro';
  dailyGenerations: {
    count: number;
    lastReset: number; // Timestamp
  };
  onboardingCompleted?: boolean;
}


export enum AppState {
  IDLE,
  ANALYZING,
  SHOWING_RESULTS,
  SHOWING_DETAILED_RECIPE,
}

export enum ResultsMode {
  USE_WHAT_I_HAVE,
  MARKET_MODE,
  WEEKLY_PLAN,
}

export enum AppMode {
  INGREDIENTS,
  DISH_PHOTO,
  LEFTOVERS,
}

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  flavorProfile?: FlavorProfile | null;
  restrictions?: string[];
  myKitchen?: {
    appliances: string[];
    utensils: string[];
  };
  // Monetization / plan fields
  generationsUsed: number;
  isPro: boolean;
}