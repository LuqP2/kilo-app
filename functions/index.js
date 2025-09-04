const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Type } = require('@google/genai');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Gemini client is initialized lazily inside each request handler to avoid
// long-running work or timeouts during cold start/deploys.
// Do NOT initialize GoogleGenAI at module scope.

// Helper to convert base64 image data into parts expected by the frontend service
const filePartFromBase64 = (base64, mimeType) => ({ inlineData: { data: base64, mimeType } });

// A minimal wrapper to forward prompts to Gemini while keeping server-side key private.
app.post('/identifyIngredients', async (req, res) => {
  try {
    const { images } = req.body; // [{ data: base64, mimeType }, ...]
    const parts = images.map(img => filePartFromBase64(img.data, img.mimeType));
    parts.push({ text: 'Analise estas imagens de uma geladeira ou despensa e liste todos os ingredientes comestíveis que você pode identificar. Responda com um array JSON de strings (português do Brasil).' });

    // Lazy init Gemini client inside handler
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set.');
      res.status(500).send({ error: 'GEMINI_API_KEY environment variable not set.' });
      return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }, thinkingConfig: { thinkingBudget: 0 } }
    });

    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/classifyImage', async (req, res) => {
  try {
    const { image } = req.body; // { data, mimeType }
    const part = filePartFromBase64(image.data, image.mimeType);
    const prompt = "Analise esta imagem. Responda com 'INGREDIENTS' ou 'DISH'.";
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set.');
      res.status(500).send({ error: 'GEMINI_API_KEY environment variable not set.' });
      return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [part, { text: prompt }] }, config: { thinkingConfig: { thinkingBudget: 0 } } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

// --- Shared helpers, schemas and prompt builders (copied from frontend service) ---
const concisenessPrompt = "Seja o mais conciso e breve possível em todas as respostas. Use frases curtas. Evite descrições longas e floreios. O objetivo é a máxima eficiência de tokens.";

const PROHIBITED_KEYWORDS = ['cachorro','cão','gato','animal de estimação','humano','barata','aranha','escorpião','formiga','mosca','mosquito','rato','pomba','urina','fezes','vômito','terra','sabão','detergente','veneno','bateria','pilha'];

function validateIngredientsServer(ingredients) {
  for (const ingredient of ingredients) {
    const lowerIngredient = ingredient.toLowerCase();
    if (lowerIngredient.includes('sal da terra')) continue;
    for (const prohibited of PROHIBITED_KEYWORDS) {
      const regex = new RegExp(`\\b${prohibited}\\b`, 'i');
      if (regex.test(lowerIngredient)) {
        throw new Error(`Ingrediente inválido detectado: "${ingredient}".`);
      }
    }
  }
}

// Minimal schema objects using the genai Type names are not necessary here; we'll instruct Gemini to return JSON and rely on parsing.

const buildPersonalizationPrompt = (settings) => {
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
    if (flavorProfile && flavorProfile.favoriteCuisines && flavorProfile.favoriteCuisines.length > 0) {
        prompt += ` O usuário prefere os seguintes tipos de culinária: ${flavorProfile.favoriteCuisines.join(', ')}. Dê preferência a esses estilos.`;
    }
    if (flavorProfile && flavorProfile.spiceLevel) {
        prompt += ` O nível de picância preferido é ${flavorProfile.spiceLevel}. Ajuste as receitas para este gosto.`;
    }
    if (savedRecipeAnalysis && savedRecipeAnalysis.length > 0) {
        prompt += ` O usuário parece gostar de pratos com as seguintes características (aprendido com receitas salvas): ${savedRecipeAnalysis.join(', ')}. Tente incorporar esses elementos.`;
    }
    if (kitchenEquipment && kitchenEquipment.length > 0) {
        prompt += ` O usuário possui os seguintes equipamentos de cozinha: ${kitchenEquipment.join(', ')}. Dê preferência a receitas que utilizem esses itens, quando apropriado.`;
    }
    return prompt;
}

const buildMealTypePrompt = (mealTypes) => {
    return mealTypes && mealTypes.length > 0 ? ` Gere receitas que sejam EXCLUSIVAMENTE para as seguintes refeições: ${mealTypes.join(', ')}.` : '';
}

app.post('/getRecipeFromImage', async (req, res) => {
  try {
    const { image, settings } = req.body; // image: {data, mimeType}
    if (!image) return res.status(400).json({ error: 'image required' });
    const part = filePartFromBase64(image.data, image.mimeType);
    const personalizationPrompt = buildPersonalizationPrompt(settings || {});
  const prompt = `Analise esta imagem de um prato pronto. Por favor, identifique o prato e forneça uma receita completa e detalhada para prepará-lo, em português do Brasil. A receita deve, por padrão, servir 2 pessoas. ${concisenessPrompt} As instruções devem ser claras e completas para um cozinheiro iniciante. ${personalizationPrompt} A resposta DEVE ser um único objeto JSON. Este objeto DEVE seguir estritamente o schema de chaves em INGLÊS que o frontend espera: recipeName, description, ingredientsNeeded, howToPrepare, servings, calories, totalTime, tags. Lembrete final e regra mais importante: a totalidade da sua resposta, incluindo todos os valores de chave como recipeName, description, tags, e howToPrepare, DEVE ser em português do Brasil.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set.');
      res.status(500).send({ error: 'GEMINI_API_KEY environment variable not set.' });
      return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [part, { text: prompt }] }, config: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/suggestLeftoverRecipes', async (req, res) => {
  try {
    const { image, settings } = req.body;
    if (!image) return res.status(400).json({ error: 'image required' });
    const part = filePartFromBase64(image.data, image.mimeType);
    const personalizationPrompt = buildPersonalizationPrompt(settings || {});
  const prompt = `Analise esta imagem de um prato de comida que sobrou. Primeiro, identifique os componentes principais. Com base nesses componentes, crie 3 receitas NOVAS e criativas para transformar essas sobras em uma refeição diferente. ${concisenessPrompt} ${personalizationPrompt} A resposta deve ser um array JSON de 3 objetos. Cada objeto DEVE seguir estritamente o schema de chaves em INGLÊS que o frontend espera: recipeName, description, ingredientsNeeded, howToPrepare, servings, calories, totalTime, tags. Lembrete final e regra mais importante: a totalidade da sua resposta, incluindo todos os valores de chave como recipeName, description, tags, e howToPrepare, DEVE ser em português do Brasil.`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set.');
      res.status(500).send({ error: 'GEMINI_API_KEY environment variable not set.' });
      return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [part, { text: prompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/suggestRecipes', async (req, res) => {
  try {
    const { ingredients, settings, existingRecipeNames, mealTypes } = req.body;
    if (!ingredients || ingredients.length === 0) return res.status(400).json({ error: 'ingredients required' });
    validateIngredientsServer(ingredients);
    const personalizationPrompt = buildPersonalizationPrompt(settings || {});
    const mealTypePrompt = buildMealTypePrompt(mealTypes || []);
    const pantryPrompt = settings && settings.pantryStaples && settings.pantryStaples.length > 0
      ? `Você pode assumir que o usuário tem os seguintes itens básicos: ${settings.pantryStaples.join(', ')}, e água.`
      : `Assuma que o usuário tem APENAS água.`;
  const basePrompt = `Sua tarefa é criar receitas usando estrita e exclusivamente os seguintes ingredientes: ${ingredients.join(', ')}. ${pantryPrompt} ${personalizationPrompt} ${mealTypePrompt} ${concisenessPrompt} Forneça 5 receitas em um array JSON. Cada objeto RECEITA DEVE seguir estritamente o schema de chaves em INGLÊS que o frontend espera: recipeName, description, ingredientsNeeded, howToPrepare, servings, calories, totalTime, tags. Lembrete final e regra mais importante: a totalidade da sua resposta, incluindo todos os valores de chave como recipeName, description, tags, e howToPrepare, DEVE ser em português do Brasil.`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set.');
      res.status(500).send({ error: 'GEMINI_API_KEY environment variable not set.' });
      return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: basePrompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/suggestSingleRecipe', async (req, res) => {
  try {
    const { ingredients, recipesToExcludeNames, settings, mealTypes } = req.body;
    if (!ingredients || ingredients.length === 0) return res.status(400).json({ error: 'ingredients required' });
    validateIngredientsServer(ingredients);
    const personalizationPrompt = buildPersonalizationPrompt(settings || {});
    const mealTypePrompt = buildMealTypePrompt(mealTypes || []);
  const prompt = `Sua prioridade é combinar ingredientes: ${ingredients.join(', ')}. ${personalizationPrompt} ${mealTypePrompt} ${concisenessPrompt} Forneça UMA receita diferente das seguintes: ${recipesToExcludeNames || ''}. Responda com um objeto JSON. Esse objeto DEVE seguir estritamente o schema de chaves em INGLÊS que o frontend espera: recipeName, description, ingredientsNeeded, howToPrepare, servings, calories, totalTime, tags. Lembrete final e regra mais importante: a totalidade da sua resposta, incluindo todos os valores de chave como recipeName, description, tags, e howToPrepare, DEVE ser em português do Brasil.`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set.');
      res.status(500).send({ error: 'GEMINI_API_KEY environment variable not set.' });
      return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/suggestMarketModeRecipes', async (req, res) => {
  try {
    const { mainIngredients, settings, mealTypes } = req.body;
    if (!mainIngredients || mainIngredients.length === 0) return res.status(400).json({ error: 'mainIngredients required' });
    validateIngredientsServer(mainIngredients);
    const personalizationPrompt = buildPersonalizationPrompt(settings || {});
    const mealTypePrompt = buildMealTypePrompt(mealTypes || []);
  const prompt = `O usuário tem os seguintes ingredientes principais: ${mainIngredients.join(', ')}. Crie 3 receitas em português do Brasil que usem esses ingredientes como base. ${personalizationPrompt} ${mealTypePrompt} ${concisenessPrompt} Forneça um array JSON. Cada objeto DEVE seguir estritamente o schema de chaves em INGLÊS que o frontend espera: recipeName, description, ingredientsNeeded, howToPrepare, servings, calories, totalTime, tags. Lembrete final e regra mais importante: a totalidade da sua resposta, incluindo todos os valores de chave como recipeName, description, tags, e howToPrepare, DEVE ser em português do Brasil.`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set.');
      res.status(500).send({ error: 'GEMINI_API_KEY environment variable not set.' });
      return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/generateWeeklyPlan', async (req, res) => {
  try {
    const { ingredients, duration, settings, mealTypes } = req.body;
    if (!ingredients) return res.status(400).json({ error: 'ingredients required' });
    validateIngredientsServer(ingredients);
    const personalizationPrompt = buildPersonalizationPrompt(settings || {});
    const mealTypesString = (mealTypes || []).join(', ');
  const prompt = `O usuário tem os seguintes ingredientes: ${ingredients.join(', ')}. Crie um plano de refeições para ${duration} dias, incluindo: ${mealTypesString}. ${personalizationPrompt} ${concisenessPrompt} A resposta deve ser um objeto JSON. Todas as receitas incluídas no objeto DEVERÃO usar o schema de chaves em INGLÊS que o frontend espera: recipeName, description, ingredientsNeeded, howToPrepare, servings, calories, totalTime, tags. Lembrete final e regra mais importante: a totalidade da sua resposta, incluindo todos os valores de chave como recipeName, description, tags, e howToPrepare, DEVE ser em português do Brasil.`;
    const apiKey = functions.config().gemini?.api_key;
    if (!apiKey) {
      console.error('API Key for Gemini is not configured.');
      return res.status(500).json({ error: 'API Key not configured.' });
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/analyzeRecipeForProfile', async (req, res) => {
  try {
    const { recipe } = req.body;
    const prompt = `Analise o nome, a descrição e os ingredientes da seguinte receita e retorne um array JSON de 3 a 5 palavras-chave em português do Brasil. Receita: Nome: ${recipe.recipeName} Descrição: ${recipe.description}`;
    const apiKey = functions.config().gemini?.api_key;
    if (!apiKey) {
      console.error('API Key for Gemini is not configured.');
      return res.status(500).json({ error: 'API Key not configured.' });
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/adjustRecipeServings', async (req, res) => {
  try {
    const { ingredientsToAdjust, originalServings, newServings } = req.body;
    const ingredientsString = ingredientsToAdjust.map(ing => `${ing.quantity} ${ing.unit || ''} ${ing.name}`).join(', ');
    const prompt = `A seguinte lista de ingredientes é para uma receita que serve ${originalServings} pessoas: ${ingredientsString}. Recalcule para ${newServings} pessoas. Responda APENAS com um array JSON de objetos de ingredientes.`;
    const apiKey = functions.config().gemini?.api_key;
    if (!apiKey) {
      console.error('API Key for Gemini is not configured.');
      return res.status(500).json({ error: 'API Key not configured.' });
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/getTechniqueExplanation', async (req, res) => {
  try {
    const { techniqueName } = req.body;
    const prompt = `Explique a técnica culinária "${techniqueName}" em português do Brasil, em um formato de passo a passo simples. A resposta DEVE ser um array JSON de strings.`;
    const apiKey = functions.config().gemini?.api_key;
    if (!apiKey) {
      console.error('API Key for Gemini is not configured.');
      return res.status(500).json({ error: 'API Key not configured.' });
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: 'application/json' } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/getAnswerForRecipeQuestion', async (req, res) => {
  try {
    const { recipeName, recipeInstructions, question } = req.body;
    const prompt = `Nome da Receita: ${recipeName}\nModo de Preparo:\n${recipeInstructions.join('\n')}\nPergunta do Usuário: "${question}"\nSua Resposta prestativa e concisa:`;
    const apiKey = functions.config().gemini?.api_key;
    if (!apiKey) {
      console.error('API Key for Gemini is not configured.');
      return res.status(500).json({ error: 'API Key not configured.' });
    }
    const genAI = new GoogleGenAI({ apiKey });
    const modelClient = genAI.models || genAI;
    const response = await modelClient.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] } });
    return res.json({ text: response.text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

// Generic passthrough endpoint for getRecipeFromImage / suggestLeftoverRecipes etc.
// Frontend should send the prompt + schema or use one of the specific endpoints above.

exports.api = functions.https.onRequest(app);
