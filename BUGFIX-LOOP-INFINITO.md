# Correções para o Bug do Loop Infinito - adjustRecipeServings

## Problema Identificado
Em 11/09, um loop infinito no `adjustRecipeServings` gerou aproximadamente 20.000 requests, resultando em custos de R$ 3.000. O problema estava relacionado a um ciclo entre:

1. `handleServingsChange` atualiza `recipe.servings`
2. `useEffect([recipe.servings])` detecta mudança e atualiza `servingsValue`
3. Event handlers (onBlur, Enter) podem ter sido disparados repetidamente

## Correções Implementadas

### 1. Rate Limiting no Backend (`functions/index.js`)
- **Middleware de rate limiting** para todos os endpoints
- Limite específico para `/adjustRecipeServings`: **10 requests por minuto por usuário**
- Respostas HTTP 429 com `retryAfter` quando limite excedido
- Identificação por `userId` (autenticado) ou `IP` (anônimo)

### 2. Logging Detalhado no Backend
- Logs completos para todas as requisições do `adjustRecipeServings`
- Tracking de tempo de execução (total e Gemini API)
- Validação de parâmetros de entrada
- Informações de usuário, IP e User-Agent

### 3. Debouncing no Frontend (`components/RecipeModal.tsx`)
- **Debounce de 500ms** antes de executar chamadas da API
- **Rate limiting interno**: máximo 1 chamada a cada 2 segundos
- Prevenção de múltiplas chamadas simultâneas
- Cleanup automático de timeouts

### 4. Circuit Breaker (`services/geminiService.ts`)
- **Abre circuito após 5 falhas consecutivas**
- **Timeout de 1 minuto** antes de tentar novamente
- Estado Half-Open para testes graduais
- Mensagens informativas para o usuário

### 5. Melhorias de Estado e Prevenção
- Verificação se já está processando (`isAdjusting`)
- Cleanup de timeouts na desmontagem do componente
- Logs detalhados para debugging
- Tratamento específico para respostas 429 (rate limit)

## Configurações Implementadas

### Rate Limits (por minuto):
- `/adjustRecipeServings`: 10 requests
- `/suggestRecipes`: 5 requests  
- `/suggestSingleRecipe`: 5 requests
- Outros endpoints: 30 requests

### Circuit Breaker:
- Threshold: 5 falhas consecutivas
- Timeout: 60 segundos
- Estado Half-Open: 1 request de teste

### Debouncing:
- Delay: 500ms
- Rate limit interno: 2 segundos entre chamadas
- Cleanup automático de timeouts

## Monitoramento
Os logs agora incluem:
- Timestamp e duração de cada request
- Identificação de usuário/IP
- Parâmetros de entrada e saída
- Detecção de padrões suspeitos
- Performance da API Gemini

## Prevenção Futura
1. **Rate limiting** previne loops infinitos
2. **Circuit breaker** para automaticamente quando há problemas
3. **Debouncing** evita chamadas desnecessárias
4. **Logging detalhado** facilita debugging
5. **Validação robusta** de parâmetros de entrada

## Deploy
Para aplicar as correções:
1. Deploy das functions: `firebase deploy --only functions`
2. Deploy do frontend: aplicação automática no próximo build
3. Monitorar logs do Firebase Functions console

## Testes Recomendados
1. Testar mudanças rápidas de porções
2. Verificar comportamento com rede lenta
3. Simular falhas da API Gemini
4. Monitorar logs por alguns dias

Essas correções devem prevenir completamente a recorrência do problema de loop infinito.