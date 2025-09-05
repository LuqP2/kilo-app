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
            className={`px-5 py-3 text-sm font-medium rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4CAF50] ${
              isSelected
                ? 'bg-[#4CAF50] text-white border-[#4CAF50] shadow-md hover:bg-[#45a049] hover:shadow-lg'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
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
