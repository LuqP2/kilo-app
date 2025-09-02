import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, WeeklyPlan, UserSettings, Ingredient, MealType, MEAL_TYPES } from '../types';
import { checkAndIncrementUsage } from './usageService';

// --- INÍCIO DA CORREÇÃO ---

// Pega a chave da API Gemini do ambiente Vite, que é o correto para o frontend.
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Verifica se a chave foi encontrada. Se não, lança um erro claro.
if (!geminiApiKey) {
  throw new Error("VITE_GEMINI_API_KEY environment variable not set");
}

// Inicializa a IA usando a chave correta.
const ai = new GoogleGenAI({ apiKey: geminiApiKey });


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
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function identifyIngredients(imageFiles: File[]): Promise<string[]> {
  checkAndIncrementUsage();
  const imageParts = await Promise.all(imageFiles.map(fileToGenerativePart));
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        ...imageParts,
        { text: 'Analise estas imagens de uma geladeira ou despensa e liste todos os ingredientes comestíveis que você pode identificar. As imagens podem estar um pouco sem foco ou de baixa qualidade, mas faça o seu melhor para identificar os itens. Combine os ingredientes de todas as fotos em uma única lista. A resposta DEVE ser em português do Brasil. Responda com um array JSON de strings. Por exemplo: ["ovos", "leite", "alface"]' },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        }
      },
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  try {
    const jsonString = response.text.trim();
    const ingredients = JSON.parse(jsonString);
    if (Array.isArray(ingredients) && ingredients.every(item => typeof item === 'string')) {
      validateIngredients(ingredients);
      return ingredients;
    }
    return [];
  } catch (e) {
    console.error("Failed to parse ingredients JSON or validation failed:", e);
    if (e instanceof Error && e.message.includes('Ingrediente inválido detectado')) {
      throw e;
    }
    return [];
  }
}

export async function classifyImage(imageFile: File): Promise<'INGREDIENTS' | 'DISH'> {
  const imagePart = await fileToGenerativePart(imageFile);
  
  const prompt = `Analise esta imagem. A imagem mostra uma coleção de ingredientes crus (como dentro de uma geladeira, despensa ou em uma bancada) ou mostra um único prato finalizado e empratado? Responda com apenas uma palavra: 'INGREDIENTS' se for uma coleção de ingredientes, ou 'DISH' se for um prato finalizado.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        imagePart,
        { text: prompt },
      ],
    },
    config: {
        thinkingConfig: { thinkingBudget: 0 }
    }
  });

  const text = response.text.trim().toUpperCase();
  if (text.includes('DISH')) {
    return 'DISH';
  }
  // Default to ingredients if uncertain or if the response is not clear
  return 'INGREDIENTS'; 
}


const ingredientSchema = {
    type: Type.OBJECT,
    properties: {
        name: { 
            type: Type.STRING, 
            description: "Nome do ingrediente, por exemplo, 'farinha de trigo'." 
        },
        quantity: { 
            type: Type.STRING, 
            description: "Quantidade do ingrediente, como '1', '1/2', 'a gosto'." 
        },
        unit: { 
            type: Type.STRING, 
            description: "Unidade de medida. Exemplos: 'xícara', 'colher de sopa', 'unidades', 'gramas'. Deixar em branco se não aplicável (ex: para 'a gosto')." 
        },
    },
    required: ["name", "quantity", "unit"],
};

const techniqueSchema = {
    type: Type.OBJECT,
    properties: {
        term: { type: Type.STRING, description: "O termo culinário da técnica, por exemplo, 'Refogar'." },
        description: { type: Type.STRING, description: "Uma descrição muito breve (uma frase) da técnica." }
    },
    required: ["term", "description"]
};

const baseRecipeSchemaProperties = {
  recipeName: {
    type: Type.STRING,
    description: "O nome da receita.",
  },
  description: {
    type: Type.STRING,
    description: "Uma breve descrição da receita.",
  },
  howToPrepare: {
    type: Type.ARRAY,
    items: {
        type: Type.STRING
    },
    description: "Uma lista de strings com as instruções passo a passo para preparar a receita. Cada string no array deve ser um passo individual."
  },
  servings: {
    type: Type.NUMBER,
    description: "O número padrão de porções que a receita serve. O padrão deve ser 2."
  },
  calories: {
    type: Type.NUMBER,
    description: "Uma estimativa do número de calorias por porção. Ex: 450"
  },
  totalTime: {
    type: Type.NUMBER,
    description: "O tempo total estimado em minutos para preparar e cozinhar a receita. Ex: 30"
  },
  tags: {
    type: Type.ARRAY,
    items: {
        type: Type.STRING
    },
    description: "Uma lista de tags que descrevem a receita, como 'Rápido', 'Uma Panela Só', 'Sem Forno', 'Vegetariano'. Inclua as tags de esforço se aplicável."
  },
  commonQuestions: {
    type: Type.ARRAY,
    items: {
      type: Type.STRING,
    },
    description: "Uma lista de 1 pergunta comum e concisa que um cozinheiro iniciante poderia ter sobre esta receita. Ex: 'Posso usar outro tipo de queijo?'"
  },
  techniques: {
    type: Type.ARRAY,
    items: techniqueSchema,
    description: "Uma lista de até 5 técnicas culinárias importantes mencionadas no modo de preparo. Identifique termos como 'Refogar', 'Julienne', 'Emulsionar', etc."
  }
};

const standardRecipeSchema = {
    type: Type.OBJECT,
    properties: {
      ...baseRecipeSchemaProperties,
      ingredientsNeeded: {
        type: Type.ARRAY,
        items: ingredientSchema,
        description: "Uma lista estruturada dos ingredientes necessários para a receita, cada um com nome, quantidade e unidade.",
      },
    },
    required: ["recipeName", "description", "ingredientsNeeded", "howToPrepare", "servings", "calories"],
};

const marketRecipeSchema = {
    type: Type.OBJECT,
    properties: {
        ...baseRecipeSchemaProperties,
        ingredientsYouHave: {
            type: Type.ARRAY,
            items: ingredientSchema,
            description: "Lista dos ingredientes que o usuário já informou que tem (baseado na lista fornecida).",
        },
        ingredientsToBuy: {
            type: Type.ARRAY,
            items: ingredientSchema,
            description: "Lista de compras com os ingredientes que faltam para a receita.",
        },
    },
    required: ["recipeName", "description", "ingredientsYouHave", "ingredientsToBuy", "howToPrepare", "servings", "calories"],
};

export async function getRecipeFromImage(imageFile: File, settings: UserSettings): Promise<ApiRecipe | null> {
  checkAndIncrementUsage();
  const imagePart = await fileToGenerativePart(imageFile);
  const personalizationPrompt = buildPersonalizationPrompt(settings);

  const prompt = `Analise esta imagem de um prato pronto. Por favor, identifique o prato e forneça uma receita completa e detalhada para prepará-lo, em português do Brasil. A receita deve, por padrão, servir 2 pessoas. ${concisenessPrompt} As instruções devem ser claras e completas para um cozinheiro iniciante; por exemplo, se a receita usar feijão, explique como cozinhá-lo do zero ou especifique o uso de feijão em lata. ${personalizationPrompt} A resposta DEVE ser um único objeto JSON que segue estritamente o schema fornecido. A receita deve incluir 'recipeName', 'description', uma lista de 'ingredientsNeeded' (cada um com 'name', 'quantity', 'unit'), 'howToPrepare' (como um array de strings de passos claros), 'servings', uma estimativa de 'calories' por porção, 'totalTime' em minutos, 'tags' descritivas, 'commonQuestions' (com apenas 1 pergunta) e um array opcional 'techniques' com termos culinários importantes. Se você não conseguir identificar um prato com confiança a partir da imagem, retorne null.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        imagePart,
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: standardRecipeSchema,
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  try {
    const jsonString = response.text.trim();
    if (jsonString.toLowerCase() === 'null') {
        return null;
    }
    const recipe = JSON.parse(jsonString) as ApiRecipe;
    if (recipe && recipe.ingredientsNeeded) {
        validateIngredients(recipe.ingredientsNeeded.map((ing: Ingredient) => ing.name));
    }
    return recipe;
  } catch (e) {
    console.error("Failed to parse recipe from image JSON or validation failed:", e);
    if (e instanceof Error && e.message.includes('Ingrediente inválido detectado')) {
      throw e;
    }
    return null;
  }
}

export async function suggestLeftoverRecipes(imageFile: File, settings: UserSettings): Promise<ApiRecipe[]> {
  checkAndIncrementUsage();
  const imagePart = await fileToGenerativePart(imageFile);
  const personalizationPrompt = buildPersonalizationPrompt(settings);

  const prompt = `
    Analise esta imagem de um prato de comida que sobrou. Primeiro, identifique os componentes principais (ex: 'frango assado', 'arroz branco', 'brócolis cozido').
    Com base nesses componentes, crie 3 receitas NOVAS e criativas para transformar essas sobras em uma refeição completamente diferente. ${concisenessPrompt}
    Para cada receita, forneça a resposta como um objeto JSON. A resposta final deve ser um array de 3 desses objetos.
    ${personalizationPrompt}
    Cada objeto deve seguir o schema, com:
    - 'recipeName': O nome do novo prato.
    - 'description': Uma descrição que explique como a receita transforma as sobras.
    - 'ingredientsYouHave': Liste aqui os componentes da sobra que você identificou. Seja genérico, por exemplo: "Sobras de frango assado com arroz".
    - 'ingredientsToBuy': Liste os ingredientes ADICIONAIS necessários para a nova receita.
    - 'howToPrepare': O passo a passo da nova receita, que deve incluir como incorporar as sobras.
    - 'servings': O número de porções, que deve ser 2 por padrão.
    - 'calories': Uma estimativa de calorias por porção.
    - 'totalTime': O tempo total estimado em minutos para a nova receita.
    - 'tags': Tags descritivas para a nova receita.
    - 'commonQuestions': Uma lista de 1 pergunta comum que um cozinheiro poderia ter sobre esta nova receita.
    - 'techniques': Um array opcional de até 5 técnicas culinárias importantes mencionadas na nova receita.

    Seja criativo! Pense em pratos como tortas, saladas incrementadas, risotos, sanduíches gourmet, etc. A resposta deve ser em português do Brasil.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        imagePart,
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: marketRecipeSchema,
      },
    }
  });

  try {
    const jsonString = response.text.trim();
    const recipes = JSON.parse(jsonString) as ApiRecipe[];
    for (const recipe of recipes) {
        if (recipe.ingredientsToBuy) {
             validateIngredients(recipe.ingredientsToBuy.map(ing => ing.name));
        }
    }
    return recipes;
  } catch (e) {
    console.error("Failed to parse leftover recipes JSON or validation failed:", e);
    if (e instanceof Error && e.message.includes('Ingrediente inválido detectado')) {
      throw e;
    }
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: standardRecipeSchema,
      },
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  try {
    const jsonString = response.text.trim();
    const recipes = JSON.parse(jsonString) as ApiRecipe[];
    
    if (existingRecipes.length === 0) {
        const cacheKey = generateCacheKey(ingredients, settings, mealTypes);
        recipeCache.set(cacheKey, recipes);
        console.log('Result cached');
    }

    return recipes;
  } catch (e) {
    console.error("Failed to parse recipes JSON:", e);
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: standardRecipeSchema,
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

    try {
        const jsonString = response.text.trim();
        const recipe = JSON.parse(jsonString);
        return recipe as ApiRecipe;
    } catch (e) {
        console.error("Failed to parse single recipe JSON:", e);
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: marketRecipeSchema,
      },
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  try {
    const jsonString = response.text.trim();
    const recipes = JSON.parse(jsonString);
    return recipes as ApiRecipe[];
  } catch (e) {
    console.error("Failed to parse market mode recipes JSON:", e);
    return [];
  }
}


const weeklyPlanSchema = {
    type: Type.OBJECT,
    properties: {
        shoppingList: {
            type: Type.ARRAY,
            items: ingredientSchema,
            description: "Uma lista de compras única e consolidada com todos os ingredientes que o usuário precisa comprar para a semana inteira.",
        },
        plan: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING, description: "O dia do plano, por exemplo, 'Dia 1'." },
                    meals: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                mealType: { type: Type.STRING },
                                recipe: standardRecipeSchema,
                            },
                             required: ["mealType", "recipe"],
                        },
                         description: "Uma lista das refeições para o dia, cada uma com seu tipo e receita.",
                    },
                },
                required: ["day", "meals"],
            },
            description: "O plano de refeições diário, contendo as refeições solicitadas para cada dia.",
        },
    },
    required: ["shoppingList", "plan"],
};


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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: weeklyPlanSchema,
        }
    });

    try {
        const jsonString = response.text.trim();
        const plan = JSON.parse(jsonString);
        return plan as WeeklyPlan;
    } catch (e) {
        console.error("Failed to parse weekly plan JSON:", e);
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

    try {
        const jsonString = response.text.trim();
        const keywords = JSON.parse(jsonString);
        return keywords as string[];
    } catch (e) {
        console.error("Failed to parse recipe analysis JSON:", e);
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        thinkingConfig: { thinkingBudget: 0 }
    }
  });

  return response.text.trim();
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: ingredientSchema,
            },
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

     try {
        const jsonString = response.text.trim();
        const ingredients = JSON.parse(jsonString);
        return ingredients as Ingredient[];
    } catch (e) {
        console.error("Failed to adjust ingredients JSON:", e);
        // Fallback or re-throw
        throw new Error("Failed to adjust servings.");
    }
}

export async function getTechniqueExplanation(techniqueName: string): Promise<string[]> {
  const prompt = `
    Explique a técnica culinária "${techniqueName}" em português do Brasil, em um formato de passo a passo simples, ideal para um cozinheiro iniciante.
    A resposta DEVE ser um array JSON de strings, onde cada string é um passo.
    Por exemplo, para "Refogar", a resposta poderia ser:
    ["1. Aqueça uma pequena quantidade de gordura (óleo ou manteiga) em uma panela em fogo médio.", "2. Adicione ingredientes aromáticos picados, como cebola e alho.", "3. Cozinhe, mexendo ocasionalmente, até que fiquem macios e translúcidos, mas sem dourar."]
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
      },
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  try {
    const jsonString = response.text.trim();
    const steps = JSON.parse(jsonString);
    return steps as string[];
  } catch (e) {
    console.error("Failed to parse technique explanation JSON:", e);
    return ["Não foi possível carregar a explicação da técnica."];
  }
}