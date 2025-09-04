import React from 'react';
import { signInWithGoogle } from '../services/authService';
import logoUrl from '../src/assets/logo.svg';

const LoginScreen: React.FC = () => {
  const handleLogin = async () => {
    try {
      console.debug('[LoginScreen] Attempting login...');
      await signInWithGoogle();
      console.debug('[LoginScreen] Login attempt completed');
    } catch (error) {
      console.error('[LoginScreen] Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <img src={logoUrl} alt="Kilo" className="mx-auto h-20 w-20" />
        <h1 className="text-2xl font-bold mt-4">Bem-vindo ao Kilo</h1>
        <p className="mt-2 text-slate-600">Descubra receitas com o que você já tem em casa.</p>
        <button
          onClick={handleLogin}
          className="mt-6 inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-slate-800 hover:bg-slate-900"
        >
          Entrar com o Google
        </button>
      </div>
    </div>
  );
};export default LoginScreen;
