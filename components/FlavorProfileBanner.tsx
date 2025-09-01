import React from 'react';

interface FlavorProfileBannerProps {
  onOpenSettings: () => void;
  onDismiss: () => void;
}

const FlavorProfileBanner: React.FC<FlavorProfileBannerProps> = ({ onOpenSettings, onDismiss }) => {
  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 text-orange-800 p-4 rounded-r-lg mb-6 shadow-sm" role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="h-6 w-6 text-orange-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-grow">
          <p className="font-bold">Deixe as receitas com a sua cara!</p>
          <p className="text-sm">Personalize seu <span className="font-semibold">Perfil de Sabor</span> para receber sugestões que combinam perfeitamente com você.</p>
          <div className="mt-3">
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 text-sm font-semibold rounded-md text-white bg-orange-600 hover:bg-orange-700 mr-3"
            >
              Personalizar Agora
            </button>
          </div>
        </div>
         <div className="flex-shrink-0">
            <button onClick={onDismiss} className="p-1.5 rounded-md hover:bg-orange-100" aria-label="Dispensar">
                <svg className="h-5 w-5 text-orange-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default FlavorProfileBanner;