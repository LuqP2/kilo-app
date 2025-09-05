# Kilo AI Cooking Assistant - Copilot Instructions

## Architecture Overview

Kilo is a React/TypeScript SPA that transforms photos of ingredients into AI-generated recipes using Google Gemini. Key architectural decision: **Gemini API calls are backend-only** for security (API key protection) and validation.

**Stack:** React 19 + Vite + TypeScript frontend, Firebase Cloud Functions (Express) backend, Firestore + Firebase Auth, Google Gemini 2.5 Flash

## Critical File Structure

- `App.tsx` - Main orchestrator, state management, component composition
- `services/geminiService.ts` - Frontend service layer, makes HTTP calls to backend
- `functions/index.js` - Express backend, **only place Gemini client is initialized**
- `types.ts` - TypeScript contracts shared across frontend
- `AuthContext.tsx` - Firebase Auth integration + user profile management

## Key Development Patterns

### 1. Gemini Integration Pattern
**NEVER** initialize `GoogleGenAI` in frontend code. Always:
```typescript
// ✅ Frontend pattern (services/geminiService.ts)
const response = await fetch(`${FUNCTIONS_BASE}/identifyIngredients`, {
  method: 'POST',
  body: JSON.stringify({ images: base64Images })
});

// ✅ Backend pattern (functions/index.js) 
app.post('/identifyIngredients', async (req, res) => {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Lazy init inside handler
  const response = await genAI.models.generateContent({...});
});
```

### 2. Security Validation System
Multi-layer validation prevents dangerous content generation:
- `PROHIBITED_KEYWORDS` arrays in both frontend and backend
- `validateIngredientsServer()` function in backend validates user inputs
- Kitchen equipment validation with `PROHIBITED_KITCHEN_KEYWORDS`
- Safety instructions with strict persona enforcement for Gemini

### 3. State Management Pattern
App.tsx uses multiple useState hooks rather than context/Redux. Key states:
- `appState` (IDLE, LOADING_INGREDIENTS, GENERATING_RECIPES, etc.)
- `resultsMode` (USE_WHAT_I_HAVE vs MARKET_MODE)
- `userSettings` synced with Firebase via `updateUserProfile()`

### 4. Recipe Generation Flow
1. User uploads image → `ImageUploader` component
2. `App.tsx` calls `identifyIngredients()` from `geminiService.ts`
3. Service makes fetch to `/identifyIngredients` backend endpoint
4. Backend validates inputs, calls Gemini API, returns structured JSON
5. Frontend updates state → `ResultsView` renders recipes

## Development Workflow

### Local Development
```bash
# Frontend (port 5173)
npm run dev

# Backend functions (separate terminal, port 5001)
cd functions && npm install
firebase emulators:start --only functions
```

### Environment Variables
- `.env.local` (local): `GEMINI_API_KEY=your_key_here`
- Production: Set `GEMINI_API_KEY` in Firebase Functions environment

### Testing Critical Paths
1. Test ingredient validation with edge cases (prohibited words)
2. Test kitchen equipment validation in Settings → Minha Cozinha
3. Verify Gemini responses match `types.ts` Recipe interface
4. Test authentication flow and user profile persistence

## Common Integration Points

### Adding New Gemini Endpoints
1. Add function to `services/geminiService.ts` with fetch call
2. Create Express route in `functions/index.js` with lazy Gemini init
3. Add response validation and error handling
4. Update `types.ts` if new data structures needed

### User Settings & Profile
- Settings stored in Firestore via `AuthContext.updateUserProfile()`
- Kitchen equipment and pantry staples affect recipe generation
- Pro/free tier limits handled in `services/usageService.ts`

### PWA Configuration
- Vite PWA plugin configured in `vite.config.ts`
- Service worker auto-generated, handles offline fallbacks
- Manifest configured for standalone app experience

## Security Considerations
- API keys never exposed to frontend
- Multi-layer content validation (frontend + backend)
- Firebase Auth for user management
- Input sanitization before Gemini API calls
- Kitchen equipment validation prevents dangerous items

## Performance Patterns
- Recipe caching in `geminiService.ts` to reduce API calls
- Lazy loading of components and images
- Base64 image conversion for Gemini API compatibility
- Usage limits and Pro tier management

Refer to `ARQUITETURA.md` for detailed component descriptions and data flow documentation.
