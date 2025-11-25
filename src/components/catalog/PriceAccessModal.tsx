'use client';

import { useState } from 'react';
import { X, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean>;
  isLoading: boolean;
}

export function PriceAccessModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setError(false);
    const success = await onSubmit(password);

    if (!success) {
      setError(true);
      // Não limpamos a senha para o usuário poder corrigir apenas um caractere se errou
    } else {
      // Sucesso: limpa o estado e fecha (o pai controla o fechamento, mas limpamos por segurança)
      setPassword('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-4 bg-indigo-50 rounded-2xl mb-4 text-indigo-600">
            <Lock size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Acesso Restrito</h3>
          <p className="text-gray-500 mt-2 text-sm max-w-xs">
            Os preços deste catálogo são exclusivos. Insira a senha fornecida
            pelo seu representante.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              autoFocus
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite a senha de acesso"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              className={`w-full rounded-xl border p-4 pr-12 text-lg outline-none transition-all focus:ring-4 ${
                error
                  ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400 focus:ring-red-100'
                  : 'border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white focus:ring-indigo-100'
              }`}
            />

            {/* Botão Mostrar/Ocultar Senha */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-red-600 animate-in slide-in-from-top-1">
              <X size={14} /> Senha incorreta. Tente novamente.
            </div>
          )}

          <button
            type="submit"
            disabled={!password || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" /> Verificando...
              </>
            ) : (
              <>
                Ver Preços <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Não tem a senha? Entre em contato com o representante via WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
