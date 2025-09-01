import React, { useState, useEffect } from 'react';
import { UserSettings, SpiceLevel, FlavorProfile } from '../types';
import Badge from './Badge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  initialTab?: 'preferences' | 'kitchen';
}

const CUISINES = ["Brasileira", "Italiana", "Mexicana", "Asiática", "Mediterrânea", "Indiana"];
const SPICE_LEVELS: { id: SpiceLevel, name: string }[] = [
    { id: 'suave', name: 'Suave' },
    { id: 'medio', name: 'Médio' },
    { id: 'picante', name: 'Picante' },
];

const APPLIANCES = [
    { name: 'Airfryer', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8.1V3H6v5.1c0 2.9 2.1 5.4 5 5.9V17H9v3h6v-3h-2v-3c2.9-.5 5-3 5-5.9zM9 17v3" /><path d="M12 14c-1.7 0-3-1.3-3-3V5h6v6c0 1.7-1.3 3-3 3z" /></svg> },
    { name: 'Panela de Pressão', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13h2.1c.1.5.2 1 .4 1.5.2.5.5 1 .8 1.5H2v2h3.3c.3.5.7 1 1.1 1.4.4.4.9.8 1.4 1.1H2v2h8.8c.4.2.8.4 1.2.5V22h2v-1.5c.4-.1.8-.3 1.2-.5H22v-2h-6.2c.5-.3 1-.7 1.4-1.1.4-.4.8-.9 1.1-1.4H22v-2h-3.3c.3-.5.6-1 .8-1.5.2-.5.3-1 .4-1.5H22v-2H2v2z" /><path d="M6 8h12" /><path d="M9 4h6" /></svg> },
    { name: 'Micro-ondas', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 5v14" /><path d="M6 10h4" /><path d="M6 14h4" /></svg> },
    { name: 'Liquidificador', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 12.5-2-2.5-2.5 2.5" /><path d="M15 17h-6" /><path d="M16 14h-8" /><path d="M8 21h8v-2H8v2z" /><path d="M5.5 12.5c0-2.5-1-4.5-1-4.5s2.5-1 4.5-1 4.5 1 4.5 1-1 2-1 4.5" /><path d="M5.1 4.1C4 5 3 6.5 3 8c0 2.5.5 4 1 5" /><path d="M19.9 4.1c1 1 2 2.5 2 4.5s-.5 4-1 5" /></svg> },
    { name: 'Batedeira', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" /><path d="M12 15a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2a4 4 0 0 0 4 4h3" /><path d="M12 9v12" /><path d="M17 12H5" /><path d="m8 12-1.7 3.4a1 1 0 0 0 .8 1.6h.8" /></svg> },
    { name: 'Forno', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" /><path d="M20 12H4" /><path d="M6 12v.01" /><path d="M10 12v.01" /></svg> }
];

const UTENSILS = ["Frigideira de Ferro", "Panela Wok", "Mixer de Mão", "Processador", "Formas de Bolo", "Balança de Cozinha"];
const PANTRY_STAPLES = [
    'Sal', 'Pimenta do Reino', 'Azeite', 'Óleo de Cozinha', 'Vinagre', 'Açúcar', 
    'Alho', 'Cebola', 'Orégano', 'Farinha de Trigo', 'Manteiga', 'Molho de Tomate',
    'Louro', 'Páprica', 'Curry', 'Cominho', 'Noz-moscada', 'Canela em Pó'
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, initialTab = 'preferences' }) => {
  const [currentSettings, setCurrentSettings] = useState<UserSettings>(settings);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [customEquipment, setCustomEquipment] = useState('');
  const [customPantryStaple, setCustomPantryStaple] = useState('');

  useEffect(() => {
    setCurrentSettings(settings);
    setActiveTab(initialTab);
  }, [settings, isOpen, initialTab]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCurrentSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleAllergiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentSettings(prev => ({ ...prev, allergies: e.target.value }));
  };
  
  const handleCuisineChange = (cuisine: string) => {
    setCurrentSettings(prev => {
        const currentCuisines = prev.flavorProfile.favoriteCuisines || [];
        const newCuisines = currentCuisines.includes(cuisine)
            ? currentCuisines.filter(c => c !== cuisine)
            : [...currentCuisines, cuisine];
        return { ...prev, flavorProfile: { ...prev.flavorProfile, favoriteCuisines: newCuisines }};
    });
  };

  const handleSpiceLevelChange = (level: SpiceLevel) => {
    setCurrentSettings(prev => {
        const newLevel = prev.flavorProfile.spiceLevel === level ? '' : level;
        return { ...prev, flavorProfile: { ...prev.flavorProfile, spiceLevel: newLevel }};
    });
  }

  const handleEquipmentToggle = (equipmentName: string) => {
    setCurrentSettings(prev => {
        const currentEquipment = prev.kitchenEquipment || [];
        const newEquipment = currentEquipment.includes(equipmentName)
            ? currentEquipment.filter(e => e !== equipmentName)
            : [...currentEquipment, equipmentName];
        return { ...prev, kitchenEquipment: newEquipment };
    });
  };
  
  const handlePantryStapleToggle = (staple: string) => {
    setCurrentSettings(prev => {
        const stapleLower = staple.toLowerCase().trim();
        if (!stapleLower) return prev;

        const currentStaples = prev.pantryStaples || [];
        const newStaples = currentStaples.map(s => s.toLowerCase()).includes(stapleLower)
            ? currentStaples.filter(s => s.toLowerCase() !== stapleLower)
            : [...currentStaples, staple];
        return { ...prev, pantryStaples: newStaples };
    });
  };

  const handleAddCustomEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customEquipment.trim();
    if (trimmed) {
      handleEquipmentToggle(trimmed);
      setCustomEquipment('');
    }
  };

  const handleAddCustomPantryStaple = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customPantryStaple.trim();
    if (trimmed) {
      handlePantryStapleToggle(trimmed);
      setCustomPantryStaple('');
    }
  };

  const handleSave = () => {
    onSave(currentSettings);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-0 sm:p-4 transition-opacity"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:w-full sm:max-w-2xl sm:h-auto sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-slate-900">Configurações</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
           <p className="mt-1 text-sm text-slate-500">Personalize suas sugestões de receitas.</p>
        </div>
        
        <div className="px-6 mt-4 border-b border-slate-200 flex-shrink-0">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('preferences')}
                className={`shrink-0 px-1 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'preferences'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Preferências
              </button>
              <button
                onClick={() => setActiveTab('kitchen')}
                className={`shrink-0 px-1 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'kitchen'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Minha Cozinha
              </button>
            </nav>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
            {activeTab === 'preferences' && (
                <>
                    <fieldset>
                        <legend className="text-lg font-semibold text-slate-800">Perfil de Sabor</legend>
                        <div className="mt-4">
                            <h5 className="text-base font-medium text-slate-700">Cozinhas Preferidas</h5>
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {CUISINES.map(cuisine => (
                                    <label key={cuisine} className="flex items-center cursor-pointer">
                                        <input type="checkbox" checked={currentSettings.flavorProfile?.favoriteCuisines?.includes(cuisine) || false} onChange={() => handleCuisineChange(cuisine)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                                        <span className="ml-3 text-slate-700">{cuisine}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6">
                            <h5 className="text-base font-medium text-slate-700">Nível de Picância</h5>
                            <div className="mt-3 flex flex-wrap gap-3">
                                {SPICE_LEVELS.map(({ id, name }) => (
                                    <button key={id} type="button" onClick={() => handleSpiceLevelChange(id)} className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${currentSettings.flavorProfile?.spiceLevel === id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="text-lg font-semibold text-slate-800">Estilo de Vida</legend>
                        <div className="mt-4 space-y-3">
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" name="isFitMode" checked={currentSettings.isFitMode} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                                <span className="ml-3 text-slate-700 font-medium">Modo Fit</span>
                            </label>
                            <p className="ml-8 text-sm text-slate-500 -mt-2">Prioriza receitas mais saudáveis, com foco em baixo teor calórico, pouca gordura e alto valor nutritivo.</p>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="text-lg font-semibold text-slate-800">Restrições Alimentares</legend>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-center cursor-pointer"><input type="checkbox" name="isVegetarian" checked={currentSettings.isVegetarian} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/><span className="ml-3 text-slate-700">Vegetariano</span></label>
                            <label className="flex items-center cursor-pointer"><input type="checkbox" name="isVegan" checked={currentSettings.isVegan} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/><span className="ml-3 text-slate-700">Vegano</span></label>
                            <label className="flex items-center cursor-pointer"><input type="checkbox" name="isGlutenFree" checked={currentSettings.isGlutenFree} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/><span className="ml-3 text-slate-700">Sem Glúten</span></label>
                            <label className="flex items-center cursor-pointer"><input type="checkbox" name="isLactoseFree" checked={currentSettings.isLactoseFree} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/><span className="ml-3 text-slate-700">Sem Lactose</span></label>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="text-lg font-semibold text-slate-800">Alergias</legend>
                        <p className="text-sm text-slate-500">Liste os ingredientes que você não pode consumir, separados por vírgula.</p>
                        <input type="text" value={currentSettings.allergies} onChange={handleAllergiesChange} placeholder="Ex: amendoim, frutos do mar, soja" className="mt-3 w-full bg-white border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm"/>
                    </fieldset>
                </>
            )}
            {activeTab === 'kitchen' && (
                <>
                    <fieldset>
                        <legend className="text-lg font-semibold text-slate-800">Eletrodomésticos Principais</legend>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {APPLIANCES.map(appliance => {
                                const isSelected = currentSettings.kitchenEquipment?.includes(appliance.name);
                                return (
                                    <button key={appliance.name} type="button" onClick={() => handleEquipmentToggle(appliance.name)} className={`flex flex-col items-center justify-center text-center p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
                                        <div className="h-8 w-8">{appliance.icon}</div>
                                        <span className="mt-2 text-sm font-medium">{appliance.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="text-lg font-semibold text-slate-800">Utensílios Comuns</legend>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {UTENSILS.map(utensil => (
                                <label key={utensil} className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={currentSettings.kitchenEquipment?.includes(utensil) || false} onChange={() => handleEquipmentToggle(utensil)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                                    <span className="ml-3 text-slate-700">{utensil}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                     <fieldset>
                         <legend className="text-lg font-semibold text-slate-800">Outros equipamentos</legend>
                         <p className="text-sm text-slate-500">Tem algo que não está na lista? Adicione aqui.</p>
                         <form onSubmit={handleAddCustomEquipment} className="mt-3 flex gap-2">
                             <input
                                type="text"
                                value={customEquipment}
                                onChange={(e) => setCustomEquipment(e.target.value)}
                                placeholder="Ex: Máquina de waffle, fouet"
                                className="flex-grow min-w-0 bg-white border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm"
                              />
                              <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                  Adicionar
                              </button>
                         </form>
                         <div className="mt-3 flex flex-wrap gap-2">
                            {currentSettings.kitchenEquipment?.filter(e => !APPLIANCES.find(a => a.name === e) && !UTENSILS.includes(e)).map(item => (
                                <span key={item} className="inline-flex items-center gap-x-1.5 rounded-md bg-slate-200 px-2.5 py-1 text-sm font-medium text-slate-800">
                                    <span className="capitalize">{item}</span>
                                    <button type="button" onClick={() => handleEquipmentToggle(item)} className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-slate-600/20" aria-label={`Remover ${item}`}>
                                        <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-slate-700/50 group-hover:stroke-slate-700/75"><path d="M4 4l6 6m0-6l-6 6" /></svg>
                                    </button>
                                </span>
                            ))}
                         </div>
                    </fieldset>

                     <fieldset>
                        <legend className="text-lg font-semibold text-slate-800">Itens Básicos da Despensa</legend>
                        <p className="text-sm text-slate-500">Informe os temperos e itens que você sempre tem. A IA saberá que pode usá-los sem que você precise digitá-los ou fotografá-los.</p>
                        
                        <form onSubmit={handleAddCustomPantryStaple} className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={customPantryStaple}
                                onChange={(e) => setCustomPantryStaple(e.target.value)}
                                placeholder="Ex: Pimenta calabresa, açafrão"
                                className="flex-grow min-w-0 bg-white border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-sm"
                            />
                            <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                Adicionar
                            </button>
                        </form>
                        
                        <div className="mt-4 flex min-h-[44px] flex-wrap items-start justify-center gap-2" aria-live="polite">
                            {currentSettings.pantryStaples?.map(item => (
                                <Badge
                                    key={item}
                                    text={item}
                                    onClick={() => handlePantryStapleToggle(item)}
                                    removable={true}
                                />
                            ))}
                        </div>
                        
                        {(() => {
                            const lowercasedSelectedStaples = currentSettings.pantryStaples?.map(s => s.toLowerCase()) || [];
                            const filteredSuggestions = PANTRY_STAPLES.filter(suggestion => !lowercasedSelectedStaples.includes(suggestion.toLowerCase()));
                            
                            if (filteredSuggestions.length > 0) {
                                return (
                                    <div className="mt-6 pt-4 border-t border-slate-200">
                                        <p className="text-center text-sm text-slate-500 mb-3">Sugestões comuns:</p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {filteredSuggestions.map((suggestion) => (
                                                <Badge
                                                    key={suggestion}
                                                    text={suggestion}
                                                    variant="suggestion"
                                                    onClick={() => handlePantryStapleToggle(suggestion)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </fieldset>
                </>
            )}
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-200 text-right flex-shrink-0">
             <button
              onClick={handleSave}
              className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Salvar
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;