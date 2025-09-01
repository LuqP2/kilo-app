import React from 'react';
import { MealType, MEAL_TYPES } from '../types';

interface MealTypeSelectorProps {
  selectedMeals: MealType[];
  onChange: (newSelection: MealType[]) => void;
}

const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({ selectedMeals, onChange }) => {
  const handleMealChange = (meal: MealType) => {
    const newSelection = selectedMeals.includes(meal)
      ? selectedMeals.filter(m => m !== meal)
      : [...selectedMeals, meal];
    onChange(newSelection);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {MEAL_TYPES.map(meal => {
        const isSelected = selectedMeals.includes(meal);
        return (
          <button
            key={meal}
            type="button"
            onClick={() => handleMealChange(meal)}
            className={`w-full text-center px-4 py-3 text-sm font-semibold rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
              isSelected
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'bg-slate-200 text-slate-700 border-slate-200 hover:bg-slate-300 hover:border-slate-300'
            }`}
            aria-pressed={isSelected}
          >
            {meal}
          </button>
        );
      })}
    </div>
  );
};

export default MealTypeSelector;
