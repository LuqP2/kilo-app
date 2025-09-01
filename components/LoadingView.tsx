import React, { useState, useEffect } from 'react';

const messages = [
  'Analisando o conteúdo da sua geladeira...',
  'Identificando ingredientes...',
  'Procurando combinações saborosas...',
  'Consultando chefs robôs...',
  'Quase pronto para sugerir receitas!',
];

const LoadingView: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
       <svg className="animate-spin -ml-1 mr-3 h-16 w-16 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h2 className="mt-6 text-2xl font-semibold text-gray-800">Aguarde um momento...</h2>
      <p className="mt-2 text-gray-600 transition-opacity duration-500">
        {messages[messageIndex]}
      </p>
    </div>
  );
};

export default LoadingView;