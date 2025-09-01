import React from 'react';

interface RegionLockMessageProps {
  onRetry: () => void;
}

const RegionLockMessage: React.FC<RegionLockMessageProps> = ({ onRetry }) => {
  return (
    <div className="text-center max-w-2xl mx-auto bg-white p-8 rounded-xl border border-red-200 shadow-md">
      <svg className="mx-auto h-12 w-12 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Serviço Indisponível na sua Região</h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">
        Lamentamos, mas parece que a API de IA que usamos ainda não está disponível em todos os países, incluindo a Alemanha. Esta é uma restrição do provedor da tecnologia.
      </p>
      <p className="mt-4 text-md text-slate-500">
        Como alternativa, você pode tentar acessar o aplicativo usando uma VPN conectada a um servidor nos Estados Unidos ou no Brasil.
      </p>
      <div className="mt-8">
        <button
          onClick={onRetry}
          className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-800 shadow-sm hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
};

export default RegionLockMessage;
