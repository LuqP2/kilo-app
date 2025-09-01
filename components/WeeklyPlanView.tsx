import React, { useState } from 'react';
import { WeeklyPlan, Recipe, Ingredient } from '../types';

interface WeeklyPlanViewProps {
  plan: WeeklyPlan;
  onViewRecipe: (recipe: Recipe) => void;
}

const formatIngredient = (ing: Ingredient): string => {
    const { name, quantity, unit } = ing;
    const formattedName = name.trim();
    const formattedQuantity = quantity.trim().toLowerCase();
    const formattedUnit = unit.trim().toLowerCase();
    
    if (isNaN(parseFloat(formattedQuantity))) {
        return `${formattedName.charAt(0).toUpperCase() + formattedName.slice(1)} ${formattedQuantity}`;
    }

    if (!formattedUnit || formattedUnit.startsWith('unidade')) {
        return `${formattedQuantity} ${formattedName}`;
    }

    return `${formattedQuantity} ${formattedUnit} de ${formattedName}`;
};

const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({ plan, onViewRecipe }) => {
  const [shoppingListChecked, setShoppingListChecked] = useState<string[]>([]);

  const handleToggleShoppingItem = (itemName: string) => {
    setShoppingListChecked(prev => 
      prev.includes(itemName) ? prev.filter(i => i !== itemName) : [...prev, itemName]
    );
  };

  return (
    <div className="space-y-8">
      {/* Shopping List */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span role="img" aria-label="shopping cart">🛒</span>
            Lista de Compras da Semana
        </h3>
        {plan.shoppingList.length > 0 ? (
            <ul className="mt-4 space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {plan.shoppingList.map((ing, i) => {
                const isChecked = shoppingListChecked.includes(ing.name);
                return (
                   <li key={`${ing.name}-${i}`}>
                    <label className="flex items-center cursor-pointer">
                       <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleShoppingItem(ing.name)}
                        className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className={`ml-3 text-gray-700 capitalize transition-colors ${isChecked ? 'line-through text-gray-400' : ''}`}>
                        {formatIngredient(ing)}
                      </span>
                    </label>
                   </li>
                )
              })}
            </ul>
        ) : (
             <p className="mt-3 text-slate-500">Ótima notícia! Você já tem tudo o que precisa para esta semana.</p>
        )}
      </div>

      {/* Daily Plan */}
      <div className="space-y-6">
        {plan.plan.map((dailyPlan) => (
          <div key={dailyPlan.day} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
             <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h4 className="text-lg font-semibold text-slate-700">{dailyPlan.day}</h4>
             </div>
             <div className="divide-y divide-slate-200">
                {dailyPlan.meals.map(({ mealType, recipe }) => (
                    <div key={`${dailyPlan.day}-${mealType}`} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-shrink-0 font-semibold text-slate-600 w-28">{mealType}:</div>
                        <div className="flex-grow">
                            <p className="text-slate-800 font-medium">{recipe.recipeName}</p>
                        </div>
                        <div className="flex-shrink-0">
                            <button onClick={() => onViewRecipe(recipe)} className="text-sm font-semibold text-orange-600 hover:underline">
                                Ver Receita &rarr;
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyPlanView;