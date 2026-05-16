'use client';

import React, { useEffect, useState } from 'react';
import { Lock, X, Loader2 } from 'lucide-react';

interface PasswordModalProps {
  isPasswordModalOpen: boolean;
  setIsPasswordModalOpen: (isOpen: boolean) => void;
  passwordInput: string;
  setPasswordInput: (password: string) => void;
  handleUnlockPrices: (e: React.FormEvent) => Promise<void>;
}

export function PasswordModal({
  isPasswordModalOpen,
  setIsPasswordModalOpen,
  passwordInput,
  setPasswordInput,
  handleUnlockPrices,
}: PasswordModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Body scroll-lock
  useEffect(() => {
    document.body.style.overflow = isPasswordModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isPasswordModalOpen]);

  if (!isPasswordModalOpen) return null;

  return (
    // Isolamento absoluto da Viewport
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 md:p-4 isolation-isolate">
      {/* Backdrop com desfoque e índice isolado */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-0"
        onClick={() => setIsPasswordModalOpen(false)}
      />
      
      {/* Alterado h-screen para h-[100dvh] para respeitar barras de navegadores mobile */}
      <div className="relative z-10 bg-white dark:bg-slate-900 w-full h-[100dvh] md:h-auto md:max-w-xs md:rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
        <button
          onClick={() => setIsPasswordModalOpen(false)}
          className="absolute top-4 right-4 z-20 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-center pt-16 md:pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="mb-6">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Área Restrita</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Digite a senha para ver os preços.
            </p>
          </div>
          
          <form
            id="password-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!passwordInput.trim() || isLoading) return;
              setIsLoading(true);
              try {
                await handleUnlockPrices(e);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <input
              type="text"
              name="username"
              autoComplete="username"
              className="sr-only"
              aria-hidden="true"
            />
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="Senha"
              required
              disabled={isLoading}
              className="w-full p-3 text-center text-lg border rounded-xl outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-slate-900"
              value={passwordInput}
              onChange={(e) => setPasswordInput(String(e.target.value).trimStart())}
            />
          </form>
        </div>

        {/* Footer: Sticky */}
        <div className="sticky bottom-0 p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="submit"
            form="password-form"
            disabled={isLoading || !passwordInput.trim()}
            className="w-full py-3 min-h-[44px] bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Verificando...</span>
              </>
            ) : (
              'Desbloquear'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}