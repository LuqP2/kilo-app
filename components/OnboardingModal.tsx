import React, { useState } from 'react';

interface DietaryPreferences {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
}

interface OnboardingModalProps {
  onComplete: (data: { kitchenEquipment: string[]; preferences: DietaryPreferences }) => void;
  onSkip: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [kitchenEquipment, setKitchenEquipment] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences>({
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
  });

  const handleEquipmentToggle = (equipment: string) => {
    setKitchenEquipment((prev) =>
      prev.includes(equipment)
        ? prev.filter((item) => item !== equipment)
        : [...prev, equipment]
    );
  };

  const handleDietaryChange = (preference: keyof DietaryPreferences) => {
    setDietaryPreferences((prev) => ({
      ...prev,
      [preference]: !prev[preference],
    }));
  };

  const equipmentOptions = [
    { name: 'Airfryer', icon: '🔥' },
    { name: 'Panela de Pressão', icon: '⚡' },
    { name: 'Micro-ondas', icon: '📟' },
    { name: 'Forno', icon: '🔥' },
    { name: 'Liquidificador', icon: '🌪️' },
    { name: 'Batedeira', icon: '🥄' }
  ];

  const dietaryOptions = [
    { key: 'isVegetarian' as keyof DietaryPreferences, label: 'Vegetariano', icon: '🥬' },
    { key: 'isVegan' as keyof DietaryPreferences, label: 'Vegano', icon: '🌱' },
    { key: 'isGlutenFree' as keyof DietaryPreferences, label: 'Sem Glúten', icon: '🌾' },
    { key: 'isLactoseFree' as keyof DietaryPreferences, label: 'Sem Lactose', icon: '🥛' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        
        {/* Modal positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900 mb-2" id="modal-title">
                {step === 1 && 'Bem-vindo ao Kilo! 👋'}
                {step === 2 && 'Sua Cozinha'}
                {step === 3 && 'Suas Preferências'}
                {step === 4 && 'Tudo Pronto! 🎉'}
              </h3>
              <p className="text-sm text-slate-500">
                {step === 1 && 'Vamos personalizar sua experiência culinária'}
                {step === 2 && 'Quais equipamentos você tem disponível?'}
                {step === 3 && 'Conte-nos sobre suas preferências alimentares'}
                {step === 4 && 'Agora você pode gerar receitas personalizadas'}
              </p>
              
              {/* Progress indicator */}
              <div className="flex justify-center space-x-2 mt-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                      index + 1 === step 
                        ? 'bg-orange-500' 
                        : index + 1 < step 
                          ? 'bg-green-500' 
                          : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-slate-50 px-6 py-6 min-h-[300px]">
            {step === 1 && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🍳</span>
                </div>
                <div className="space-y-3">
                  <p className="text-base text-slate-700">
                    O Kilo transforma os ingredientes que você tem em receitas deliciosas usando inteligência artificial.
                  </p>
                  <p className="text-sm text-slate-600">
                    Vamos configurar suas preferências para sugestões mais precisas.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {equipmentOptions.map((equipment) => {
                    const isSelected = kitchenEquipment.includes(equipment.name);
                    return (
                      <button
                        key={equipment.name}
                        type="button"
                        onClick={() => handleEquipmentToggle(equipment.name)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-900'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{equipment.icon}</span>
                          <span className="font-medium text-sm">{equipment.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 text-center mt-4">
                  Selecione os equipamentos que você tem. Isso nos ajuda a sugerir receitas adequadas.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {dietaryOptions.map((option) => {
                    const isSelected = dietaryPreferences[option.key];
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleDietaryChange(option.key)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{option.icon}</span>
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 text-center mt-4">
                  Suas preferências alimentares nos ajudam a filtrar receitas adequadas para você.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✨</span>
                </div>
                <div className="space-y-3">
                  <p className="text-base text-slate-700">
                    Perfeito! Sua experiência está personalizada.
                  </p>
                  <p className="text-sm text-slate-600">
                    Você pode ajustar essas configurações a qualquer momento nas Configurações → Minha Cozinha.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white px-6 py-4 flex justify-between items-center">
            <div className="flex space-x-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-full hover:bg-slate-50 transition-colors duration-200"
                >
                  Voltar
                </button>
              )}
              
              {step < 4 && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors duration-200"
                >
                  Pular
                </button>
              )}
            </div>
            
            <div>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-full transition-colors duration-200"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onComplete({ kitchenEquipment, preferences: dietaryPreferences })}
                  className="px-6 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full transition-colors duration-200"
                >
                  Finalizar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
