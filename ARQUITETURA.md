# ARQUITETURA — Kilo (Onboarding técnico)

## 1. Visão Geral do Projeto
O Kilo é um assistente de cozinha que transforma fotos de ingredientes ou imagens de pratos em receitas e planos de refeição usando IA.

Stack principal
- Frontend: React (v19) + Vite + TypeScript
- Backend: Firebase Cloud Functions (Node.js) — funções HTTP/Express
- Banco de dados / autenticação: Firebase (Firestore e Firebase Auth)
- IA: Google Gemini (acessada apenas pelo backend)

---

## 2. Arquitetura da Solução
O aplicativo segue o padrão SPA (Single Page Application) com um cliente web (React/Vite) que comunica-se com um conjunto de Cloud Functions (Express) hospedadas no Firebase. O Firestore armazena dados do usuário (perfil, receitas salvas, configurações) e o Auth gerencia login/identidade.

Por que a API Gemini foi movida para o backend
- Segurança da chave: a chave da API Gemini é sensível; se inicializada no browser ela seria exposta aos usuários e a terceiros. Colocando as chamadas no backend, a chave fica apenas em variáveis de ambiente do servidor/Functions e não é enviada ao cliente.
- Controle e logging: o backend pode validar e sanitizar prompts, aplicar limites de uso e logar eventos para monitoramento e cobrança.
- Conformidade de CORS e quotas: funções servem como proxy, centralizando políticas, timeouts e controle de taxa.

---

## 3. Fluxo de Dados Principal (Foto → Receita)
Sequência de alto nível quando o usuário envia uma foto de ingredientes:

1. O usuário faz upload da foto no cliente via componente `ImageUploader` (UI em `App.tsx`).
2. `App.tsx` chama a função `identifyIngredients` no arquivo `services/geminiService.ts` fornecendo o arquivo (base64) e metadados.
3. `geminiService.ts` envia uma requisição HTTP (fetch) para a Cloud Function `POST /identifyIngredients` (endpoint em `functions/index.js`).
4. A Cloud Function `identifyIngredients` recebe a requisição, monta o prompt e inicializa o cliente Gemini localmente (lazy init) usando a variável de ambiente `GEMINI_API_KEY`.
5. A função faz a chamada à API Gemini enviando as partes da imagem e o prompt.
6. A Gemini retorna uma resposta (texto/JSON) para a Cloud Function.
7. A Cloud Function encaminha a resposta ao frontend (normalmente como `{ text: response.text }`).
8. `geminiService.ts` recebe a resposta, faz parse/validação mínima e retorna dados estruturados para `App.tsx`.
9. `App.tsx` atualiza seu estado com os ingredientes identificados; isso aciona a renderização de `ResultsView.tsx`, exibindo as receitas/sugestões.

Notas:
- O backend também valida entradas (p.ex. `validateIngredientsServer`) para evitar conteúdo proibido.
- O frontend aplica controles de uso (limites por usuário) antes de acionar novas gerações.

---

## 4. Descrição dos Componentes Chave
Cada descrição tem 2–3 frases, propósito e relação com o fluxo.

- `App.tsx`
  - Propósito: orquestrador principal do estado da aplicação e do roteamento de ações do usuário (upload, geração, visualização). Ele compõe a UI principal, mantém estados globais (imagens, ingredientes, receitas, configurações) e chama serviços no diretório `services/`.
  - Relação: inicia chamadas para o backend via `services/geminiService.ts` e passa dados para componentes como `ResultsView` e `RecipeModal`.

- `services/geminiService.ts`
  - Propósito: camada de comunicação entre frontend e backend para operações de IA (identificação de ingredientes, geração de receitas, análise etc.).
  - Relação: converte arquivos para base64, constrói payloads e faz `fetch` para os endpoints das Cloud Functions, além de tratar respostas e aplicar validações/limitadores de uso.

- `AuthContext.tsx`
  - Propósito: provê contexto React para autenticação e perfil do usuário (login, logout, estado do usuário) e integra com Firestore para persistência de perfil e dados salvos.
  - Relação: usado por componentes para obter o usuário atual, carregar receitas salvas e restringir funcionalidades dependentes de conta.

- `functions/index.js`
  - Propósito: implementação do backend em Express que expõe endpoints HTTP (por exemplo `/identifyIngredients`, `/suggestRecipes`, `/getRecipeFromImage`, `/generateWeeklyPlan`). Todas as chamadas à Gemini são feitas aqui de forma segura.
  - Relação: recebe requisições do frontend, valida/normaliza prompts, inicializa o cliente Gemini por requisição (lazy init) usando `process.env.GEMINI_API_KEY`, chama o modelo e retorna o conteúdo para o frontend.

- `types.ts`
  - Propósito: arquivo de tipagem TypeScript que define as interfaces e tipos usados no frontend (por exemplo `Recipe`, `UserSettings`, `MealType`).
  - Relação: garante contrato entre componentes e facilita transferência de dados; o backend procura respeitar o schema (prompts instruem Gemini a retornar chaves específicas que o frontend espera).

---

## 5. Infraestrutura e Deploy
Pipelines & automação
- O repositório está preparado para deploy automatizado via GitHub Actions (workflows que executam build, testes e `firebase deploy` para hosting/functions). O CI executa `npm ci` e `npm run build` para garantir artefatos de frontend antes do deploy.

Gerenciamento de segredos
- Localmente: variáveis sensíveis podem ser armazenadas em um arquivo `.env.local` (não comitado) e carregadas no ambiente de desenvolvimento.
- Em produção (Firebase Functions v2): a variável secreta `GEMINI_API_KEY` deve ser definida como variável de ambiente/Secret Manager ligada às Functions. Exemplos:
  - `gcloud functions deploy ... --set-env-vars=GEMINI_API_KEY="SUA_CHAVE"` (para Gen2 através do gcloud)
  - Ou usar Secret Manager e vinculá-lo: `--set-secrets=GEMINI_API_KEY=projects/YOUR_PROJECT/secrets/GEMINI_API_KEY:latest`.

Deploy recomendado (resumo)
1. No diretório `functions/` executar `npm install` e garantir `functions/package.json` com dependências server-only (`@google/genai`).
2. Definir a variável `GEMINI_API_KEY` em produção (Secret Manager ou env vars).
3. Rodar `firebase deploy --only functions,hosting` (ou usar `gcloud functions deploy` para Gen2 e `firebase deploy --only hosting`).

Considerações finais e boas práticas
- Nunca mova `@google/genai` para dependências do cliente (root) — mantenha apenas em `functions/package.json`.
- Evite inicializar clientes externos em escopo de módulo nas Functions (lazy init dentro do handler evita timeouts/deploy issues).
- Adicione validação/normalização no backend para transformar chaves de resposta da IA caso o modelo retorne nomes inesperados.
- Monitoramento: ative logs de uso e cotas (Cloud Logging) e configure alertas para uso excessivo da API Gemini.

---

## 6. Funcionalidades do Usuário

###  Funcionalidades de Upload e Análise
1. **Upload de fotos de ingredientes** - Fotografar ou selecionar imagens dos ingredientes disponíveis
2. **Upload de fotos de pratos** - Fotografar pratos para obter receitas similares
3. **Upload de fotos de sobras** - Fotografar restos de comida para sugestões de aproveitamento
4. **Identificação automática de ingredientes** - IA analisa as imagens e lista os ingredientes encontrados
5. **Classificação automática de imagens** - Sistema diferencia entre ingredientes e pratos prontos

###  Entrada Manual de Dados
6. **Entrada manual de ingredientes** - Digitar ingredientes quando não há fotos
7. **Seleção de ingredientes** - Escolher quais ingredientes usar das listas identificadas
8. **Adição de ingredientes extras** - Incluir ingredientes não detectados nas fotos

###  Geração de Receitas
9. **Modo "Use o que tenho"** - Receitas usando apenas ingredientes disponíveis
10. **Modo "Ida ao mercado"** - Receitas que incluem ingredientes para comprar
11. **Geração de receitas por tipo de refeição** - Café da manhã, almoço, jantar, lanche, sobremesa, acompanhamento
12. **Regeneração de receitas** - Gerar novas sugestões com os mesmos ingredientes
13. **Buscar mais receitas** - Expandir a lista de sugestões
14. **Substituição individual de receitas** - Trocar uma receita específica por outra nova
15. **Receitas para aproveitamento de sobras** - Sugestões específicas para restos de comida

###  Planejamento Semanal
16. **Geração de plano semanal** - Planos de 3, 5 ou 7 dias
17. **Seleção de tipos de refeição para planos** - Escolher quais refeições incluir no planejamento
18. **Lista de compras automática** - Gerada automaticamente com base no plano semanal

###  Gerenciamento de Receitas
19. **Salvar receitas favoritas** - Marcar receitas para acesso posterior
20. **Visualizar receitas salvas** - Modal com todas as receitas guardadas
21. **Remover receitas salvas** - Excluir receitas da lista de favoritos
22. **Visualização detalhada de receitas** - Modal expandido com informações completas
23. **Edição de receitas salvas** - Modificar receitas já salvas

###  Configurações Pessoais - Aba Preferências
24. **Perfil de sabor** - Definir cozinhas preferidas (Brasileira, Italiana, Mexicana, etc.)
25. **Nível de picância** - Escolher entre suave, médio ou picante
26. **Modo Fit** - Priorizar receitas mais saudáveis e nutritivas
27. **Restrições alimentares** - Vegetariano, vegano, sem glúten, sem lactose
28. **Alergias** - Lista personalizada de ingredientes a evitar

###  Configurações Pessoais - Minha Cozinha
29. **Eletrodomésticos principais** - Airfryer, panela de pressão, micro-ondas, liquidificador, batedeira, forno
30. **Utensílios comuns** - Frigideira de ferro, panela wok, mixer de mão, processador, formas de bolo, balança
31. **Equipamentos personalizados** - Adicionar outros equipamentos não listados
32. **Itens básicos da despensa** - Definir temperos e ingredientes sempre disponíveis
33. **Sugestões de despensa** - Sistema sugere itens comuns para adicionar

###  Autenticação e Perfil
34. **Login com Google** - Acesso via conta Google
35. **Logout** - Sair da conta
36. **Perfil de usuário** - Dados salvos na nuvem (Firebase)
37. **Sincronização entre dispositivos** - Dados acessíveis em qualquer dispositivo

###  Sistema de Planos
38. **Plano gratuito** - Limite de gerações diárias
39. **Plano PRO** - Uso ilimitado
40. **Contador de uso** - Visualizar gerações restantes
41. **Modal de upgrade** - Opção para evoluir para PRO

###  Funcionalidades Interativas de Receitas
42. **Filtros de esforço** - Rápido (-30 min), Uma Panela Só, Sem Forno
43. **Ajuste de porções** - Calcular ingredientes para diferentes quantidades
44. **Perguntas sobre receitas** - Sistema de Q&A sobre preparos específicos
45. **Explicação de técnicas** - Detalhamento de termos culinários
46. **Análise de perfil da receita** - Sistema aprende com receitas salvas

###  Progressive Web App (PWA)
47. **Instalação como app** - Botão para instalar no dispositivo
48. **Funcionamento offline** - Acesso básico sem internet
49. **Notificações push** - Alertas e lembretes (quando implementado)

###  Segurança e Validação
50. **Validação de ingredientes** - Sistema bloqueia ingredientes perigosos ou impróprios
51. **Validação de equipamentos** - Impede adição de itens perigosos na cozinha
52. **Filtros de conteúdo** - IA treinada para gerar apenas conteúdo culinário seguro

###  Funcionalidades Especiais
53. **Banner de perfil de sabor** - Sugestões para melhorar personalização
54. **Mensagens de região bloqueada** - Controle de acesso geográfico
55. **Sistema de cache** - Reduz uso da API reutilizando resultados similares
56. **Tratamento de erros** - Mensagens informativas para problemas de conexão

**Total: 56 funcionalidades principais** que o usuário pode acessar e utilizar no app Kilo!

---

## Arquivos de referência (onde olhar primeiro)
- `App.tsx` — entrada e orquestração do frontend
- `index.tsx` — bootstrap do React e registro do service worker
- `services/geminiService.ts` — todas as chamadas à API via functions
- `functions/index.js` — backend e proxy de Gemini
- `types.ts` — contratos de dados usados pelo frontend

---

Fim do documento.
