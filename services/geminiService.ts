import { Recipe, WeeklyPlan, UserSettings, Ingredient, MealType, MEAL_TYPES } from '../types';
import { checkAndIncrementUsage } from './usageService';
// Frontend no longer initializes GoogleGenAI directly. Calls are proxied to a secure server endpoint.
const FUNCTIONS_BASE = `${import.meta.env.VITE_FUNCTIONS_BASE || ''}/api`;


// The recipe object returned from the API, without the client-side ID
type ApiRecipe = Omit<Recipe, 'id'>;

// Cache implementation to reduce API calls for identical requests
const recipeCache = new Map<string, ApiRecipe[]>();
const generateCacheKey = (ingredients: string[], settings: UserSettings, mealTypes: MealType[]): string => {
  const sortedIngredients = [...ingredients].sort().join(',');
  const sortedMealTypes = [...mealTypes].sort().join(',');
  const settingsString = JSON.stringify(settings);
  return `${sortedIngredients}|${sortedMealTypes}|${settingsString}`;
};

const concisenessPrompt = "Seja o mais conciso e breve possível em todas as respostas. Use frases curtas. Evite descrições longas e floreios. O objetivo é a máxima eficiência de tokens.";

const PROHIBITED_KEYWORDS = [
  // Unethical / Pets
  'cachorro', 'cão', 'gato', 'animal de estimação', 'humano',
  // Pests / Dangerous Insects
  'barata', 'aranha', 'escorpião', 'formiga', 'mosca', 'mosquito',
  // Other dangerous/toxic/inappropriate
  'rato', 'pomba', 'urina', 'fezes', 'vômito', 'terra', 'sabão', 'detergente', 'veneno', 'bateria', 'pilha'
];

function validateIngredients(ingredients: string[]): void {
  for (const ingredient of ingredients) {
    const lowerIngredient = ingredient.toLowerCase();

    // Allow known safe exceptions that contain a prohibited word.
    if (lowerIngredient.includes('sal da terra')) {
      continue;
    }

    for (const prohibited of PROHIBITED_KEYWORDS) {
      // Use regex with word boundaries (\b) to match whole words only.
      // This prevents false positives on substrings (e.g., 'rato' in 'prato' or 'terra' in 'beterraba').
      const regex = new RegExp(`\\b${prohibited}\\b`, 'i');
      if (regex.test(lowerIngredient)) {
        throw new Error(`Ingrediente inválido detectado: "${ingredient}". Por razões de segurança e ética, não podemos processar receitas com ingredientes impróprios para consumo humano.`);
      }
    }
  }
}


async function fileToGenerativePart(file: File) {
  // For compatibility with older code paths; prefer fileToBase64 for making requests to functions
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  const full = await base64EncodedDataPromise;
  return {
    inlineData: { data: full.split(',')[1], mimeType: file.type },
  };
}

async function fileToBase64(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function identifyIngredients(imageFiles: File[]): Promise<string[]> {
  checkAndIncrementUsage();
  const images = await Promise.all(imageFiles.map(async (file) => {
    const base64 = await fileToBase64(file);
    return { data: base64.split(',')[1], mimeType: file.type };
  }));

  const resp = await fetch(`${FUNCTIONS_BASE}/identifyIngredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images })
  });

  if (!resp.ok) {
    console.error('identifyIngredients failed', await resp.text());
    return [];
  }

  const body = await resp.json();
  try {
    const ingredients = JSON.parse(body.text.trim());
    if (Array.isArray(ingredients) && ingredients.every(item => typeof item === 'string')) {
      validateIngredients(ingredients);
      return ingredients;
    }
  } catch (e) {
    console.error('Failed to parse ingredients from function response', e);
  }
  return [];
}

export async function classifyImage(imageFile: File): Promise<'INGREDIENTS' | 'DISH'> {
  const base64 = await fileToBase64(imageFile);
  const resp = await fetch(`${FUNCTIONS_BASE}/classifyImage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: { data: base64.split(',')[1], mimeType: imageFile.type } })
  });
  if (!resp.ok) {
    console.error('classifyImage failed', await resp.text());
    return 'INGREDIENTS';
  }
  const body = await resp.json();
  const text = (body.text || '').trim().toUpperCase();
  if (text.includes('DISH')) return 'DISH';
  return 'INGREDIENTS';
}


// NOTE: Schema definitions and in-browser GenAI calls have been removed from the frontend.
// All model invocations and response schema enforcement happen server-side in the Cloud Functions.

export async function getRecipeFromImage(imageFile: File, settings: UserSettings): Promise<ApiRecipe | null> {
  checkAndIncrementUsage();
  const base64 = await fileToBase64(imageFile);
  const resp = await fetch(`${FUNCTIONS_BASE}/getRecipeFromImage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: { data: base64.split(',')[1], mimeType: imageFile.type }, settings })
  });

  if (!resp.ok) {
    console.error('getRecipeFromImage failed', await resp.text());
    return null;
  }

  const body = await resp.json();
  try {
    const jsonString = body.text.trim();
    if (jsonString.toLowerCase() === 'null') return null;
    const recipe = JSON.parse(jsonString) as ApiRecipe;
    if (recipe && recipe.ingredientsNeeded) validateIngredients(recipe.ingredientsNeeded.map((ing: Ingredient) => ing.name));
    return recipe;
  } catch (e) {
    console.error('Failed to parse recipe from function response', e);
    return null;
  }
}

export async function suggestLeftoverRecipes(imageFile: File, settings: UserSettings): Promise<ApiRecipe[]> {
  checkAndIncrementUsage();
  const base64 = await fileToBase64(imageFile);
  const resp = await fetch(`${FUNCTIONS_BASE}/suggestLeftoverRecipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: { data: base64.split(',')[1], mimeType: imageFile.type }, settings })
  });

  if (!resp.ok) {
    console.error('suggestLeftoverRecipes failed', await resp.text());
    return [];
  }

  const body = await resp.json();
  try {
    const jsonString = body.text.trim();
    const recipes = JSON.parse(jsonString) as ApiRecipe[];
    for (const recipe of recipes) {
      if (recipe.ingredientsToBuy) validateIngredients(recipe.ingredientsToBuy.map(ing => ing.name));
    }
    return recipes;
  } catch (e) {
    console.error('Failed to parse leftover recipes from function response', e);
    return [];
  }
}

const buildPersonalizationPrompt = (settings: UserSettings): string => {
    let prompt = '';
    if (settings.isFitMode) {
        prompt += ' A receita deve ser "fit", ou seja, mais saudável, com foco em baixo teor calórico, pouca gordura e alto valor nutritivo. Dê preferência a ingredientes integrais, vegetais e proteínas magras. Evite frituras e excesso de açúcar ou carboidratos simples.';
    }
    if (settings.isVegetarian) prompt += ' A receita deve ser estritamente vegetariana.';
    if (settings.isVegan) prompt += ' A receita deve ser estritamente vegana.';
    if (settings.isGlutenFree) prompt += ' A receita deve ser estritamente sem glúten.';
    if (settings.isLactoseFree) prompt += ' A receita deve ser estritamente sem lactose.';
    if (settings.allergies && settings.allergies.trim() !== '') {
        prompt += ` A receita NÃO PODE CONTER nenhum dos seguintes ingredientes: ${settings.allergies.trim()}.`;
    }

    if (settings.effortFilters && settings.effortFilters.length > 0) {
        prompt += ' A receita deve atender aos seguintes critérios de esforço: ';
        const effortDescriptions = settings.effortFilters.map(filter => {
            if (filter === 'Rápido (-30 min)') return 'ser rápida (tempo total de preparo e cozimento inferior a 30 minutos)';
            if (filter === 'Uma Panela Só') return 'usar apenas uma panela/frigideira principal para minimizar a louça';
            if (filter === 'Sem Forno') return 'não utilizar o forno';
            return '';
        });
        prompt += effortDescriptions.filter(Boolean).join(', ') + '.';
    }

    const { flavorProfile, savedRecipeAnalysis, kitchenEquipment } = settings;
    if (flavorProfile.favoriteCuisines.length > 0) {
        prompt += ` O usuário prefere os seguintes tipos de culinária: ${flavorProfile.favoriteCuisines.join(', ')}. Dê preferência a esses estilos.`;
    }
    if (flavorProfile.spiceLevel) {
        prompt += ` O nível de picância preferido é ${flavorProfile.spiceLevel}. Ajuste as receitas para este gosto.`;
    }
    if (savedRecipeAnalysis.length > 0) {
        prompt += ` O usuário parece gostar de pratos com as seguintes características (aprendido com receitas salvas): ${savedRecipeAnalysis.join(', ')}. Tente incorporar esses elementos.`;
    }
    if (kitchenEquipment && kitchenEquipment.length > 0) {
        prompt += ` O usuário possui os seguintes equipamentos de cozinha: ${kitchenEquipment.join(', ')}. Dê preferência a receitas que utilizem esses itens, quando apropriado.`;
    }

    return prompt;
}

const buildMealTypePrompt = (mealTypes: MealType[]): string => {
    if (mealTypes.length === 0 || mealTypes.length === MEAL_TYPES.length) {
        return ''; // No specific filter needed if all or none are selected.
    }

    const hasMainMeal = mealTypes.includes('Almoço') || mealTypes.includes('Jantar');
    const hasSideDish = mealTypes.includes('Acompanhamento');

    let prompt = ` Gere receitas que sejam EXCLUSIVAMENTE para as seguintes refeições: ${mealTypes.join(', ')}.`;

    // If the user asks for a main meal but doesn't specify side dishes, prioritize main courses.
    if (hasMainMeal && !hasSideDish) {
        prompt += ' Ao gerar receitas para Almoço ou Jantar, foque em pratos principais. Evite sugerir apenas acompanhamentos simples (como farofa, arroz branco ou saladas básicas) como receita principal.';
    } 
    // If the user specifically asks for side dishes but not main meals.
    else if (!hasMainMeal && hasSideDish) {
        prompt += ' Foque em criar acompanhamentos, entradas ou saladas para complementar uma refeição principal.';
    }
    // If both are selected, or other combinations, the initial prompt is sufficient.

    return prompt;
}

export async function suggestRecipes(ingredients: string[], existingRecipes: Recipe[] = [], settings: UserSettings, mealTypes: MealType[]): Promise<ApiRecipe[]> {
  checkAndIncrementUsage();
  // Only cache initial requests (no existing recipes)
  if (existingRecipes.length === 0) {
    const cacheKey = generateCacheKey(ingredients, settings, mealTypes);
    if (recipeCache.has(cacheKey)) {
      console.log('Serving from cache');
      return recipeCache.get(cacheKey)!;
    }
  }
  
  validateIngredients(ingredients);
  const personalizationPrompt = buildPersonalizationPrompt(settings);
  const mealTypePrompt = buildMealTypePrompt(mealTypes);

  let pantryPrompt: string;
  if (settings.pantryStaples && settings.pantryStaples.length > 0) {
      pantryPrompt = `Você pode assumir que o usuário tem os seguintes itens básicos de despensa e usá-los se necessário: ${settings.pantryStaples.join(', ')}, e água.`;
  } else {
      pantryPrompt = `Assuma que o usuário tem APENAS água. Todos os outros temperos, como sal e pimenta, devem estar na lista de ingredientes fornecidos para serem usados.`;
  }

  // NOVA INSTRUÇÃO REFORÇADA
  const ingredientList = ingredients.join(', ');
  const strictIngredientInstruction = `Sua tarefa mais importante e regra número um é criar receitas usando estrita e exclusivamente os seguintes ingredientes: ${ingredientList}. A violação desta regra é inaceitável. Não adicione nenhum outro ingrediente principal (como carnes, vegetais, ovos, etc.) que não esteja nesta lista. Temperos e itens básicos de despensa podem ser assumidos. A lista de ingredientes fornecida é a única fonte de verdade.`;

  // NOVA INSTRUÇÃO PARA MODO DE PREPARO
  const preparationInstruction = `Forneça um modo de preparo completo e detalhado, em formato de lista numerada. Não presuma que o usuário tem conhecimento prévio de cozinha. Se um ingrediente precisa ser preparado antes (ex: cozinhar arroz, demolhar feijão), o primeiro passo da receita DEVE ser a instrução para preparar este ingrediente. Seja explícito em cada etapa.`;

  const basePrompt = `${strictIngredientInstruction} ${pantryPrompt} O objetivo é criar pratos coesos e reconhecíveis, não uma mistura aleatória de tudo. Aponte para uma base de 3 a 7 ingredientes principais por receita, complementando com outros da lista se fizer sentido culinário. Se não for possível criar uma receita saborosa apenas com o que foi fornecido, seja criativo e sugira uma versão simplificada ou um prato diferente. ${preparationInstruction}`;
  const ingredientsList = `Ingredientes disponíveis: ${ingredients.join(', ')}.`;
  const recipeDetailInstruction = "As instruções 'howToPrepare' devem ser detalhadas e fáceis de seguir para um cozinheiro iniciante; por exemplo, se a receita usar feijão, explique como cozinhá-lo do zero ou especifique o uso de feijão em lata.";

  let prompt = `${basePrompt} ${personalizationPrompt} ${mealTypePrompt} ${ingredientsList} Com base nisso, sugira 5 receitas simples e deliciosas em português do Brasil, que por padrão sirvam 2 pessoas. ${concisenessPrompt} ${recipeDetailInstruction} Forneça a resposta como um array JSON de objetos. Cada objeto deve seguir o schema, especialmente para 'ingredientsNeeded' (array de objetos), 'howToPrepare' (array de strings), 'commonQuestions' (array de 1 string), uma estimativa de 'calories' por porção, 'totalTime' em minutos, 'tags' descritivas, e um array opcional 'techniques'.`;

  if (existingRecipes.length > 0) {
    const existingRecipeNames = existingRecipes.map(r => r.recipeName).join(', ');
    prompt = `${basePrompt} ${personalizationPrompt} ${mealTypePrompt} ${ingredientsList} Com base nisso, sugira 5 NOVAS receitas simples e deliciosas, em português do Brasil, DIFERENTES das seguintes: ${existingRecipeNames}. As receitas devem, por padrão, servir 2 pessoas. ${concisenessPrompt} ${recipeDetailInstruction} Forneça a resposta como um array JSON de objetos. Cada objeto deve seguir o schema, especialmente para 'ingredientsNeeded' (array de objetos), 'howToPrepare' (array de strings), 'commonQuestions' (array de 1 string), uma estimativa de 'calories' por porção, 'totalTime' em minutos, 'tags' descritivas, e um array opcional 'techniques'.`;
  }

  // Proxy to backend function that calls Gemini server-side
  try {
    const resp = await fetch(`${FUNCTIONS_BASE}/suggestRecipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, settings, existingRecipeNames: existingRecipes.map(r => r.recipeName), mealTypes })
    });

    if (!resp.ok) {
      console.error('suggestRecipes failed', await resp.text());
      return [];
    }

    const body = await resp.json();
    const jsonString = (body.text || '').trim();
    const recipes = JSON.parse(jsonString) as ApiRecipe[];

    if (existingRecipes.length === 0) {
      const cacheKey = generateCacheKey(ingredients, settings, mealTypes);
      recipeCache.set(cacheKey, recipes);
      console.log('Result cached');
    }

    return recipes;
  } catch (e) {
    console.error('Failed to fetch/parse recipes from function', e);
    return [];
  }
}


export async function suggestSingleRecipe(ingredients: string[], recipesToExclude: Recipe[], settings: UserSettings, mealTypes: MealType[]): Promise<ApiRecipe | null> {
    checkAndIncrementUsage();
    validateIngredients(ingredients);
    const personalizationPrompt = buildPersonalizationPrompt(settings);
    const mealTypePrompt = buildMealTypePrompt(mealTypes);
    const excludedNames = recipesToExclude.map(r => r.recipeName).join(', ');

    let pantryPrompt: string;
    if (settings.pantryStaples && settings.pantryStaples.length > 0) {
        pantryPrompt = `Você pode assumir que o usuário tem os seguintes itens básicos de despensa e usá-los se necessário: ${settings.pantryStaples.join(', ')}, e água.`;
    } else {
        pantryPrompt = `Assuma que o usuário tem APENAS água. Todos os outros temperos, como sal e pimenta, devem estar na lista de ingredientes fornecidos para serem usados.`;
    }

    const basePrompt = `Sua prioridade é combinar de forma inteligente vários ingredientes da lista. O objetivo é criar pratos coesos e reconhecíveis, não uma mistura aleatória de tudo. Aponte para uma base de 3 a 7 ingredientes principais por receita, complementando com outros da lista se fizer sentido culinário. Você DEVE criar receitas usando ESTRITAMENTE os ingredientes fornecidos. A lista de 'ingredientsNeeded' na sua resposta JSON deve conter APENAS itens da lista de ingredientes disponíveis. ${pantryPrompt} É PROIBIDO adicionar QUALQUER outro ingrediente que não esteja na lista principal ou na lista de itens básicos. Se não for possível criar uma receita saborosa apenas com o que foi fornecido, seja criativo e sugira uma versão simplificada ou um prato diferente.`;
    const ingredientsList = `Ingredientes disponíveis: ${ingredients.join(', ')}.`;
    const recipeDetailInstruction = "As instruções 'howToPrepare' devem ser detalhadas e fáceis de seguir para um cozinheiro iniciante; por exemplo, se a receita usar feijão, explique como cozinhá-lo do zero ou especifique o uso de feijão em lata.";

    const prompt = `${basePrompt} ${personalizationPrompt} ${mealTypePrompt} ${ingredientsList} Com base nisso, sugira UMA NOVA receita em português do Brasil que seja diferente das seguintes: ${excludedNames}. A receita deve, por padrão, servir 2 pessoas. ${concisenessPrompt} ${recipeDetailInstruction} Responda com um único objeto JSON seguindo o schema, especialmente para 'ingredientsNeeded' (array de objetos), 'howToPrepare' (array de strings), 'commonQuestions' (array de 1 string), uma estimativa de 'calories' por porção, 'totalTime' em minutos, 'tags' descritivas, e um array opcional 'techniques'.`;

    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/suggestSingleRecipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, recipesToExcludeNames: excludedNames, settings, mealTypes })
      });
      if (!resp.ok) {
        console.error('suggestSingleRecipe failed', await resp.text());
        return null;
      }
      const body = await resp.json();
      const jsonString = (body.text || '').trim();
      const recipe = JSON.parse(jsonString) as ApiRecipe;
      return recipe;
    } catch (e) {
      console.error('Failed to fetch/parse single recipe from function', e);
      return null;
    }
}

export async function suggestMarketModeRecipes(mainIngredients: string[], settings: UserSettings, mealTypes: MealType[]): Promise<ApiRecipe[]> {
  checkAndIncrementUsage();
  validateIngredients(mainIngredients);
  const personalizationPrompt = buildPersonalizationPrompt(settings);
  const mealTypePrompt = buildMealTypePrompt(mealTypes);
  const recipeDetailInstruction = "As instruções 'howToPrepare' devem ser detalhadas e fáceis de seguir para um cozinheiro iniciante; por exemplo, se a receita usar feijão, explique como cozinhá-lo do zero ou especifique o uso de feijão em lata.";
  const prompt = `O usuário tem os seguintes ingredientes principais: ${mainIngredients.join(', ')}. Crie 3 receitas deliciosas em português do Brasil que usem esses ingredientes como base. As receitas devem, por padrão, servir 2 pessoas. ${recipeDetailInstruction} ${personalizationPrompt} ${mealTypePrompt} ${concisenessPrompt} A receita pode e deve incluir outros ingredientes comuns para se tornar um prato completo. Na sua resposta, separe claramente a lista de ingredientes em duas categorias: 'ingredientsYouHave' (baseado na lista fornecida) e 'ingredientsToBuy' (o que falta para comprar). Forneça a resposta como um array JSON de objetos, seguindo o schema. Cada receita também deve incluir um array 'commonQuestions' com 1 pergunta, uma estimativa de 'calories' por porção, 'totalTime' em minutos, 'tags' descritivas, e um array opcional 'techniques'.`;

  try {
    const resp = await fetch(`${FUNCTIONS_BASE}/suggestMarketModeRecipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mainIngredients, settings, mealTypes })
    });
    if (!resp.ok) {
      console.error('suggestMarketModeRecipes failed', await resp.text());
      return [];
    }
    const body = await resp.json();
    const jsonString = (body.text || '').trim();
    const recipes = JSON.parse(jsonString) as ApiRecipe[];
    return recipes;
  } catch (e) {
    console.error('Failed to fetch/parse market mode recipes from function', e);
    return [];
  }
}


// weekly plan schema removed from frontend; server enforces schema and returns validated JSON


export async function generateWeeklyPlan(ingredients: string[], duration: number, settings: UserSettings, mealTypes: MealType[]): Promise<WeeklyPlan | null> {
    checkAndIncrementUsage();
    validateIngredients(ingredients);
    const personalizationPrompt = buildPersonalizationPrompt(settings);
    const mealTypesString = mealTypes.join(', ');

    const prompt = `
        O usuário tem os seguintes ingredientes: ${ingredients.join(', ')}.
        Crie um plano de refeições para ${duration} dias, incluindo as seguintes refeições para cada dia: ${mealTypesString}.
        O objetivo principal é maximizar o uso dos ingredientes que o usuário já possui para minimizar o desperdício.
        Distribua os ingredientes existentes de forma inteligente ao longo da semana.
        Gere uma lista de compras única e consolidada, contendo APENAS os ingredientes adicionais necessários para completar todas as receitas do plano.
        IMPORTANTE: Todas as receitas dentro do plano devem ser detalhadas, fáceis de seguir para um cozinheiro iniciante e, por padrão, servir 2 pessoas. Por exemplo, se uma receita usar feijão, explique como cozinhá-lo do zero ou especifique o uso de feijão em lata. Todo o conteúdo deve ser em português do Brasil e seguir estas regras de personalização: ${personalizationPrompt}.
        ${concisenessPrompt}
        A resposta deve ser um objeto JSON seguindo o schema, com uma 'shoppingList' e um 'plan' diário. O 'plan' deve conter um array 'meals' para cada dia. Cada receita dentro do plano deve ter o campo 'commonQuestions' com 1 pergunta, uma estimativa de 'calories' por porção, 'totalTime' em minutos, 'tags' descritivas, e um array opcional 'techniques'.
    `;

    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/generateWeeklyPlan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, duration, settings, mealTypes })
      });
      if (!resp.ok) {
        console.error('generateWeeklyPlan failed', await resp.text());
        return null;
      }
      const body = await resp.json();
      const jsonString = (body.text || '').trim();
      const plan = JSON.parse(jsonString) as WeeklyPlan;
      return plan;
    } catch (e) {
      console.error('Failed to fetch/parse weekly plan from function', e);
      return null;
    }
}

export async function analyzeRecipeForProfile(recipe: Recipe): Promise<string[]> {
    const prompt = `
        Analise o nome, a descrição e os ingredientes da seguinte receita e retorne um array JSON de 3 a 5 palavras-chave em português do Brasil que descrevam seu perfil de sabor, estilo de culinária ou ingredientes principais.
        Seja conciso. Exemplos: ["picante", "cominho", "culinária mexicana"], ["agridoce", "asiático", "gengibre"], ["comfort food", "cremoso", "queijo"].

        Receita:
        Nome: ${recipe.recipeName}
        Descrição: ${recipe.description}
    `;

    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/analyzeRecipeForProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe })
      });
      if (!resp.ok) {
        console.error('analyzeRecipeForProfile failed', await resp.text());
        return [];
      }
      const body = await resp.json();
      const jsonString = (body.text || '').trim();
      const keywords = JSON.parse(jsonString) as string[];
      return keywords;
    } catch (e) {
      console.error('Failed to fetch/parse recipe analysis from function', e);
      return [];
    }
}

export async function getAnswerForRecipeQuestion(recipeName: string, recipeInstructions: string[], question: string): Promise<string> {
  const prompt = `
    Com base na seguinte receita, responda à pergunta do usuário. Sua resposta deve ser extremamente concisa (idealmente uma frase, máximo duas), mas mantendo um tom amigável, encorajador e útil, como se estivesse ajudando um amigo na cozinha. Vá direto ao ponto. Evite respostas robóticas, secas ou passivo-agressivas. A resposta deve ser em português do Brasil.

    Nome da Receita: ${recipeName}
    Modo de Preparo:
    ${recipeInstructions.join('\n')}

    Pergunta do Usuário: "${question}"

    Sua Resposta prestativa e concisa:
  `;

  try {
    const resp = await fetch(`${FUNCTIONS_BASE}/getAnswerForRecipeQuestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeName, recipeInstructions, question })
    });
    if (!resp.ok) {
      console.error('getAnswerForRecipeQuestion failed', await resp.text());
      return '';
    }
    const body = await resp.json();
    return (body.text || '').trim();
  } catch (e) {
    console.error('Failed to fetch answer for recipe question', e);
    return '';
  }
}

export async function adjustRecipeServings(ingredientsToAdjust: Ingredient[], originalServings: number, newServings: number): Promise<Ingredient[]> {
    if (ingredientsToAdjust.length === 0) return [];

    const ingredientsString = ingredientsToAdjust.map(ing => `${ing.quantity} ${ing.unit || ''} ${ing.name}`).join(', ');

    const prompt = `
        A seguinte lista de ingredientes é para uma receita que serve ${originalServings} pessoas: ${ingredientsString}.
        Por favor, recalcule as quantidades de cada ingrediente para que a receita sirva ${newServings} pessoas.
        IMPORTANTE: As quantidades devem ser práticas para um cozinheiro humano. Use frações comuns (como '1/2', '1/4') em vez de decimais longos sempre que possível. Para itens como 'dentes de alho', arredonde para o número inteiro ou meio mais próximo, se razoável. Evite números como '0.665 dentes de alho'; prefira '1 dente de alho'. A resposta deve ser útil numa cozinha real.
        Responda APENAS com um array JSON de objetos de ingredientes, em português do Brasil. Cada objeto deve ter 'name', 'quantity', e 'unit'.
    `;

    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/adjustRecipeServings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientsToAdjust, originalServings, newServings })
      });
      if (!resp.ok) {
        console.error('adjustRecipeServings failed', await resp.text());
        throw new Error('Failed to adjust servings.');
      }
      const body = await resp.json();
      const jsonString = (body.text || '').trim();
      const ingredients = JSON.parse(jsonString) as Ingredient[];
      return ingredients;
    } catch (e) {
      console.error('Failed to fetch/parse adjusted ingredients from function', e);
      throw new Error('Failed to adjust servings.');
    }
}

export async function getTechniqueExplanation(techniqueName: string): Promise<string[]> {
  const prompt = `
    Explique a técnica culinária "${techniqueName}" em português do Brasil, em um formato de passo a passo simples, ideal para um cozinheiro iniciante.
    A resposta DEVE ser um array JSON de strings, onde cada string é um passo.
    Por exemplo, para "Refogar", a resposta poderia ser:
    ["1. Aqueça uma pequena quantidade de gordura (óleo ou manteiga) em uma panela em fogo médio.", "2. Adicione ingredientes aromáticos picados, como cebola e alho.", "3. Cozinhe, mexendo ocasionalmente, até que fiquem macios e translúcidos, mas sem dourar."]
  `;

  try {
    const resp = await fetch(`${FUNCTIONS_BASE}/getTechniqueExplanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ techniqueName })
    });
    if (!resp.ok) {
      console.error('getTechniqueExplanation failed', await resp.text());
      return ["Não foi possível carregar a explicação da técnica."];
    }
    const body = await resp.json();
    const jsonString = (body.text || '').trim();
    const steps = JSON.parse(jsonString) as string[];
    return steps;
  } catch (e) {
    console.error('Failed to fetch/parse technique explanation from function', e);
    return ["Não foi possível carregar a explicação da técnica."];
  }
}