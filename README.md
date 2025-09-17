# Kilo

**AI-powered cooking assistant that transforms ingredient photos into personalized recipes**

[Live Demo](https://kilo.app.br) | [Install as PWA](https://kilo.app.br) | [Star this repo](https://github.com/LuqP2/kilo-app)

---

## Overview

Kilo is an AI-powered cooking assistant that solves the daily "what should I cook" problem by analyzing ingredient photos and generating personalized, equipment-aware recipes.

## Key Features

**Photo-to-Recipe Generation**: Upload photos of ingredients and receive instant recipe suggestions
**Equipment-Aware Filtering**: Only suggests recipes based on available kitchen equipment
**Weekly Meal Planning**: Generate meal plans that minimize food waste
**Smart Shopping Lists**: Auto-generated shopping lists for missing ingredients
**AI Personalization**: Learns user preferences and dietary restrictions over time

---

## Problem Statement

The daily decision of "what to cook" affects millions of households globally. Traditional recipe apps provide inspiration but fail to address practical limitations like available ingredients and kitchen equipment.

## Solution

Kilo creates a new category of culinary assistant focused on execution rather than inspiration. The application analyzes available ingredients through computer vision and generates executable recipes based on actual kitchen capabilities.

### Workflow Example

1. User uploads photo of available ingredients
2. AI identifies ingredients: tomatoes, pasta, cheese, basil
3. System filters by user's equipment profile: "microwave available, no oven"
4. Generates recipe: "Microwave Caprese Pasta Bowl - 12 minutes"
5. Provides complete cooking instructions optimized for available equipment

---

## Technical Architecture

## Technical Architecture

**Frontend**: React 19 with TypeScript and Vite build system
**Backend**: Firebase Cloud Functions (Node.js/Express)
**Database**: Firestore with Firebase Authentication
**AI Integration**: Google Gemini 2.5 Flash API
**Hosting**: Firebase Hosting with Progressive Web App support

### Architecture Decisions

**Security-First Design**: AI API keys are never exposed to the frontend environment
**Mobile Optimization**: Built-in image compression for low-memory devices
**Performance Optimization**: Intelligent caching reduces API costs by 60%
**Safety Implementation**: Multi-layer validation prevents dangerous ingredient suggestions

---

## Development Timeline

**Phase 1 (Days 1-2)**: Core AI integration and photo processing
**Phase 2 (Days 3-4)**: Recipe generation and personalization engine
**Phase 3 (Days 5-6)**: Weekly planning and shopping list automation
**Phase 4 (Days 7-8)**: PWA deployment and user authentication

**Total Development Time**: 8 days from concept to production deployment

---

## Implementation Details

## Implementation Details

### Secure AI Integration
```typescript
// Incorrect: API keys exposed in frontend
const genAI = new GoogleGenAI(API_KEY); 

// Correct: API keys secured in backend Cloud Functions
export const identifyIngredients = functions.https.onRequest(async (req, res) => {
  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
  // Processing logic here
});
```

### Image Processing Pipeline
- **Automatic compression** for mobile device compatibility
- **Memory-aware processing** with device detection
- **Emergency fallback compression** for extreme low-memory scenarios

### AI Prompting System
- **Equipment-aware recipe filtering** based on user profile
- **Dietary restriction enforcement** with safety validation
- **Flavor profile learning** from user interaction patterns
- **Safety validation layer** prevents dangerous ingredient combinations

---

## Feature Set

### Core AI Functionality
- Ingredient recognition from photo uploads
- Image classification (raw ingredients vs prepared dishes)
- Personalized recipe generation
- Leftover transformation into new meal suggestions

### Cooking Assistant Features
- Equipment integration (filters recipes by available tools)
- Portion adjustment with practical measurement conversions
- Cooking technique explanations for unfamiliar terms
- Interactive Q&A system for recipe clarification

### Meal Planning System
- Weekly meal plans (3, 5, or 7-day options)
- Automated shopping list generation
- Food waste minimization through intelligent planning
- Meal type filtering (breakfast, lunch, dinner, snacks)

### Personalization Engine
- Dietary preference management (vegetarian, vegan, gluten-free)
- Allergy management with strict enforcement protocols
- Flavor profile learning from user behavior analysis
- Effort-based filtering (quick meals, one-pot dishes, no-oven recipes)

### User Experience
- Progressive Web App with offline functionality
- Mobile-first design with camera integration
- Firebase Authentication with Google Sign-In
- Real-time synchronization across devices

---

## Current Status

## Current Status

**Production Status**: Active development with live deployment
**User Base**: 15+ beta testers across 4 countries
**User Feedback**: Positive reception with feature requests for additional functionality
**Availability**: Production-ready application at [kilo.app.br](https://kilo.app.br)

---

## Development Setup

## Development Setup

### Prerequisites
- Node.js (LTS version recommended)
- Firebase CLI
- Google Gemini API key

### Installation
```bash
# Frontend setup
npm install
npm run dev

# Backend Functions setup
cd functions
npm install
firebase emulators:start --only functions

# Environment configuration
cp .env.example .env.local
# Configure your GEMINI_API_KEY
```

### Environment Variables
```bash
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FUNCTIONS_BASE=your_functions_url
GEMINI_API_KEY=your_gemini_key  # Backend only
```

---

## Deployment

**CI/CD Pipeline**: Automated deployment with GitHub Actions
- Frontend build with Vite optimization
- Firebase Hosting deployment
- Cloud Functions updates
- Environment secret management

### Manual Deployment
```bash
npm run build
firebase deploy
```

---

## Technical Insights

## Technical Insights

### Development Learnings
**AI API Security**: Critical importance of keeping API keys secure in backend services
**Mobile Performance**: Image compression essential for mobile device compatibility
**Prompt Engineering**: Extensive iteration required for optimal AI recipe generation
**Firebase Architecture**: Serverless architecture provides excellent scalability

### Product Development Insights
**User Behavior**: Users prioritize execution capability over recipe inspiration
**Technical Constraints**: Equipment limitations more significant than ingredient availability
**MVP Strategy**: Rapid development possible through focused feature prioritization

---

## Project Significance

**Technical Demonstration**: Showcases full-stack development capabilities, AI integration, and performance optimization
**Problem Solving**: Addresses real-world daily decision fatigue with practical solutions
**Modern Stack Integration**: Demonstrates contemporary development practices and security implementations

---

## Roadmap

## Roadmap

### Planned Features
- User analytics integration for behavior analysis
- Recipe rating system for quality improvement
- Social sharing capabilities for recipe distribution
- Voice command integration for hands-free cooking
- Nutritional analysis integration for health tracking

---

## Contact Information

**Developer**: Available for freelance opportunities
**Specializations**: React, Firebase, AI Integration
**Availability**: Immediate

**Live Application**: [kilo.app.br](https://kilo.app.br)

---

## License

MIT License - Open source for educational and development purposes

---

**Built with modern development practices, AI integration, and practical problem-solving methodologies.**