import React, { useEffect } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {

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
        <div className="p-6 text-center border-b border-slate-200">
           <div className="absolute top-4 right-4">
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar modal"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
           </div>
           <h3 className="text-2xl font-bold text-orange-600">Limite Diário Atingido</h3>
           <p className="mt-2 text-slate-600">Você utilizou suas 5 gerações de receitas gratuitas de hoje.</p>
        </div>
        
        <div className="p-6 md:p-8 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free Plan */}
                <div className="p-6 rounded-lg border-2 border-slate-300">
                    <h4 className="text-xl font-semibold text-slate-800">Kilo Essencial</h4>
                    <p className="mt-2 text-slate-500">O plano gratuito, perfeito para começar.</p>
                    <p className="mt-6 text-3xl font-bold text-slate-900">
                        Grátis
                    </p>
                    <ul className="mt-6 space-y-3 text-slate-600">
                        <li className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>5 receitas por dia</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>Todas as funcionalidades</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>Salvar receitas</span>
                        </li>
                    </ul>
                    <button onClick={onClose} className="mt-8 w-full text-center px-4 py-2 text-sm font-semibold rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50">
                        Seu plano atual
                    </button>
                </div>

                 {/* Pro Plan */}
                <div className="p-6 rounded-lg border-2 border-orange-500 relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">MAIS POPULAR</span>
                    <h4 className="text-xl font-semibold text-orange-600">Kilo Pro</h4>
                    <p className="mt-2 text-slate-500">Cozinhe sem limites e com total liberdade.</p>
                     <p className="mt-6 text-3xl font-bold text-slate-900">
                        R$ 9,90<span className="text-lg font-medium text-slate-500">/mês</span>
                    </p>
                    <ul className="mt-6 space-y-3 text-slate-600">
                        <li className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span className="font-semibold text-slate-800">Receitas ILIMITADAS</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>Todas as funcionalidades</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>Acesso antecipado a novidades</span>
                        </li>
                    </ul>
                     <button onClick={() => console.log('Upgrade to Pro clicked')} className="mt-8 w-full text-center px-4 py-2 text-sm font-semibold rounded-md text-white bg-orange-600 hover:bg-orange-700 shadow-sm">
                        Fazer Upgrade
                    </button>
                </div>
            </div>
            <div className="mt-6 text-center">
                 <button onClick={() => console.log('Upgrade to Annual clicked')} className="text-sm font-semibold text-orange-600 hover:underline">
                    Ou economize com o plano anual: R$ 99,00/ano
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
