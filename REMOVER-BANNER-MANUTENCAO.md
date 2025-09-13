# Banner de Manutenção - Instruções para Remoção

## O que foi implementado

Foi adicionado um banner de manutenção temporário na tela inicial do app para informar aos usuários beta que o sistema está em manutenção devido aos problemas de loop infinito que geraram custos excessivos.

### Alterações feitas:

1. **Banner visual** no topo da HomeScreen
2. **Desabilitação** de todos os inputs e botões principais
3. **Mensagens informativas** sobre a manutenção
4. **Estilos visuais** para indicar elementos desabilitados

## Arquivos modificados:

- `components/HomeScreen.tsx` - Adicionado banner e desabilitado controles
- `components/HomeScreen.css` - Estilos para banner e elementos desabilitados

## Como remover quando as APIs voltarem:

### 1. Remover o banner JSX

No arquivo `components/HomeScreen.tsx`, **remover este bloco**:

```tsx
{/* Banner de manutenção */}
<div className="maintenance-banner">
  <div className="maintenance-content">
    <div className="maintenance-icon">🔧</div>
    <div className="maintenance-text">
      <strong>Manutenção em Progresso</strong>
      <p>Nosso sistema está temporariamente em manutenção para melhorias. Voltaremos em breve!</p>
    </div>
  </div>
</div>
```

### 2. Reabilitar os controles

**Remover a propriedade `disabled`** dos seguintes elementos:

- Input de busca (search-input)
- Botão da câmera (camera-button) 
- Botões do seletor de modo (mode-button)
- Botões de buscar receitas (search-recipes-button)

**Restaurar os placeholders originais** do input:
```tsx
placeholder={
  searchMode === 'recipe' 
    ? "Ex: Fricassê de frango, Lasanha bolonhesa..." 
    : ingredients.length > 0 
      ? "Adicionar mais ingredientes..." 
      : "Ex: arroz, frango, batata..."
}
```

**Restaurar os textos originais** dos botões:
```tsx
// Para busca por ingredientes:
🔍 Buscar Receitas ({ingredients.length} {ingredients.length === 1 ? 'ingrediente' : 'ingredientes'})

// Para busca por receita:
🔍 Buscar Receita: "{inputValue.trim()}"
```

### 3. Remover estilos CSS (opcional)

No arquivo `components/HomeScreen.css`, **remover estas seções**:

```css
/* Banner de manutenção */
.maintenance-banner { ... }
.maintenance-content { ... }
.maintenance-icon { ... }
.maintenance-text { ... }

/* Estilos para elementos desabilitados durante manutenção */
.search-input:disabled { ... }
.camera-button:disabled { ... }
.search-recipes-button:disabled { ... }
.mode-button:disabled { ... }
```

## Comando rápido para reverter

Para reverter rapidamente todas as alterações:

```bash
git checkout HEAD~1 -- components/HomeScreen.tsx components/HomeScreen.css
```

## Quando remover

Remover o banner **APÓS**:
1. ✅ APIs do Gemini reativadas
2. ✅ Functions de backend deployed com correções de rate limiting
3. ✅ Testes de funcionamento realizados
4. ✅ Monitoramento ativo dos logs

**Importante**: Manter o banner pelo menos 24h para garantir que as correções estão funcionando adequadamente.