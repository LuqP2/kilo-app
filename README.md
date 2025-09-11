# Kilo 🍳 

**AI-powered cooking assistant that transforms ingredient photos into personalized recipes**

[🚀 **Live Demo**](https://kilo.app.br) | [📱 **Install as PWA**](https://kilo.app.br) | [⭐ **Star this repo**](https://github.com/LuqP2/kilo-app)

---

## 🎯 The Problem
*"What should I cook today?"* - A question that haunts millions of kitchens daily.

## 💡 The Solution
Kilo is the world's first **equipment-aware cooking assistant**. Unlike recipe catalogs, Kilo creates a new category: **culinary execution assistant**.

### 🔥 What Makes Kilo Different
- **📸 Photo → Recipe**: Snap ingredients, get instant recipes
- **🔧 Equipment-Smart**: Only suggests recipes you can actually make
- **📅 Weekly Planning**: Meal plans that minimize food waste
- **🛒 Smart Shopping**: Auto-generated lists for missing ingredients
- **🎨 AI Personalization**: Learns your taste preferences over time

---

## ⚡ Quick Demo

```
1. 📱 Take photo of your fridge contents
2. 🤖 AI identifies: tomatoes, pasta, cheese, basil
3. ⚙️  Filters by your equipment: "Has microwave, no oven"
4. 🍝 Suggests: "Microwave Caprese Pasta Bowl - 12 minutes"
5. ✅ Perfect recipe for YOUR kitchen, RIGHT NOW
```

---

## 🛠️ Tech Stack

**Frontend**: React 19 + TypeScript + Vite  
**Backend**: Firebase Cloud Functions (Node.js/Express)  
**Database**: Firestore + Firebase Auth  
**AI**: Google Gemini 2.5 Flash  
**Hosting**: Firebase Hosting with PWA support  

### Key Architecture Decisions
- **🔐 Security-First**: AI API keys never exposed to frontend
- **📱 Mobile-Optimized**: Built-in image compression for low-memory devices  
- **⚡ Performance**: Intelligent caching reduces API costs by 60%
- **🛡️ Safety**: Multi-layer validation prevents dangerous ingredient suggestions

---

## 🚀 Development Timeline

**Day 1-2**: Core AI integration + photo processing  
**Day 3-4**: Recipe generation + personalization engine  
**Day 5-6**: Weekly planning + shopping list automation  
**Day 7-8**: PWA deployment + user authentication  

**Total**: **8 days** from concept to production

---

## 🏗️ Architecture Highlights

### Secure AI Integration
```typescript
// ❌ NEVER in frontend
const genAI = new GoogleGenAI(API_KEY); 

// ✅ Always in backend (Cloud Functions)
export const identifyIngredients = functions.https.onRequest(async (req, res) => {
  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
  // ...
});
```

### Smart Image Processing
- **Auto-compression** for mobile devices
- **Memory-aware** processing (detects low-memory devices)
- **Emergency fallback** compression for extreme cases

### Intelligent Prompting System
- **Equipment-aware** recipe filtering
- **Dietary restrictions** enforcement
- **Flavor profile** learning from saved recipes
- **Safety validation** prevents dangerous suggestions

---

## 🎨 Features

### 🤖 AI-Powered Core
- [x] **Ingredient Recognition** from photos
- [x] **Image Classification** (ingredients vs prepared dishes)
- [x] **Recipe Generation** with personalization
- [x] **Leftover Transformation** into new meals

### 👨‍🍳 Smart Cooking Assistant
- [x] **Equipment Integration** (only suggests makeable recipes)
- [x] **Portion Adjustment** with practical measurements
- [x] **Technique Explanations** for cooking terms
- [x] **Q&A System** for recipe questions

### 📋 Meal Planning
- [x] **Weekly Meal Plans** (3, 5, or 7 days)
- [x] **Smart Shopping Lists** (auto-generated)
- [x] **Food Waste Minimization** through intelligent planning
- [x] **Meal Type Filtering** (breakfast, lunch, dinner, etc.)

### 🎯 Personalization
- [x] **Dietary Preferences** (vegetarian, vegan, gluten-free)
- [x] **Allergy Management** with strict enforcement
- [x] **Flavor Profile Learning** from user behavior
- [x] **Effort Filters** (quick meals, one-pot, no-oven)

### 📱 Modern UX
- [x] **Progressive Web App** with offline support
- [x] **Mobile-First** design and camera integration
- [x] **Firebase Authentication** with Google Sign-In
- [x] **Real-time Sync** across devices

---

## 📊 Current Status

**🔥 Active Development**  
**👥 15+ Beta Testers** across 4 countries  
**⭐ Real User Feedback**: *"Holy sh*t, how did I never think of that?"* - Camilo, Beta User  
**🚀 Production Ready** at [kilo.app.br](https://kilo.app.br)

---

## 🔧 Local Development

```bash
# Frontend
npm install
npm run dev

# Backend Functions
cd functions
npm install
firebase emulators:start --only functions

# Environment Setup
cp .env.example .env.local
# Add your GEMINI_API_KEY
```

### Environment Variables
```bash
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FUNCTIONS_BASE=your_functions_url
GEMINI_API_KEY=your_gemini_key  # Backend only!
```

---

## 🚀 Deployment

**Automated CI/CD** with GitHub Actions:
- ✅ Builds frontend with Vite
- ✅ Deploys to Firebase Hosting
- ✅ Updates Cloud Functions
- ✅ Manages environment secrets

```bash
# Manual deployment
npm run build
firebase deploy
```

---

## 🧠 What I Learned

### Technical Insights
- **AI API Security**: Never expose keys to frontend
- **Mobile Performance**: Image compression is critical
- **Prompt Engineering**: 60+ iterations to perfect recipe generation
- **Firebase Architecture**: Serverless scales beautifully

### Product Insights  
- **User Behavior**: People want execution, not inspiration
- **Real Problems**: Equipment limitations > ingredient availability
- **MVP Focus**: 8 days possible by ruthless feature prioritization

---

## 🎯 Why This Matters

**For Recruiters**: Demonstrates full-stack capability, AI integration, and real-world problem solving in record time.

**For Users**: Solves the daily "what to cook" decision fatigue with personalized, executable solutions.

**For Developers**: Showcases modern stack integration, security best practices, and performance optimization.

---

## 📈 Next Steps

- [ ] **User Analytics** integration
- [ ] **Recipe Rating** system  
- [ ] **Social Sharing** features
- [ ] **Voice Commands** for hands-free cooking
- [ ] **Nutritional Analysis** integration

---

## 🤝 Contact

**Developer**: Looking for freelance opportunities  
**Specialties**: React + Firebase + AI Integration  
**Availability**: Immediate  

**Live Example**: This entire application at [kilo.app.br](https://kilo.app.br)

---

## ⚖️ License

MIT License - Feel free to learn from the code!

---

**💡 Built with modern tools, AI assistance, and real-world problem solving in mind.**