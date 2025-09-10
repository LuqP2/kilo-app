# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [0.9.0] - 2025-09-10

### Adicionado
- 🔐 Sistema completo de autenticação de usuários
- 📱 Suporte a PWA (Progressive Web App)
- 📸 Suporte para câmera mobile com compressão de imagens
- 🧮 Sistema de limites de uso (plano gratuito)
- 🔍 Funcionalidade de busca
- 📊 Filtros de esforço no preparo
- 🛡️ Instruções de segurança e validações
- 🗄️ Persistência de dados com Firestore
- 💾 Sistema de gerenciamento de ingredientes
- 📱 Navegação bottom bar

### Componentes UI
- Header com funcionalidades completas
- RecipeDetailView para visualização de receitas
- ResultsView otimizado
- SettingsModal com configurações do usuário
- SavedRecipesModal para receitas favoritas
- UpgradeModal para plano premium
- OnboardingModal para novos usuários
- WeeklyPlanView para planejamento semanal

### Infraestrutura
- ✅ CI/CD com GitHub Actions
- 🔥 Integração com Firebase Hosting
- 📦 Build otimizado com Vite
- 🔒 Configuração de segurança do Firestore
- 🌐 Headers de hosting ajustados
- 💻 Ambiente de desenvolvimento configurado

### Segurança
- Validação de ingredientes no backend
- Proteção de chaves de API
- Regras de segurança do Firestore
- Sanitização de inputs
- Exclusão de ingredientes básicos perigosos

### Otimizações
- Compressão e otimização de imagens
- Refinamento de prompts do Gemini
- Centralização de verificações de uso
- Melhorias no gerenciamento de estado
- Cache e persistência de dados

### DevOps
- Verificação de variáveis de ambiente
- Correções no processo de build
- Otimização de deployment
- Configuração de índices do Firestore

## Próximos Passos para 1.0.0
- [ ] Resolver bugs conhecidos
- [ ] Completar testes de usabilidade
- [ ] Validar todos os fluxos de erro
- [ ] Otimizar experiência PWA
- [ ] Melhorar performance de carregamento

[0.9.0]: https://github.com/LuqP2/kilo-app/releases/tag/v0.9.0
