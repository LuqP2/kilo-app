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
    <div className="flex flex-wrap gap-3 justify-center">
      {MEAL_TYPES.map(meal => {
        const isSelected = selectedMeals.includes(meal);
        return (
          <button
            key={meal}
            type="button"
            onClick={() => handleMealChange(meal)}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4CAF50] ${
              isSelected
                ? 'bg-[#4CAF50] text-white border-[#4CAF50] shadow-md'
                : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-gray-50'
            }`}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" />
              </svg>
            )}
            <span className="whitespace-nowrap">{meal}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MealTypeSelector;
