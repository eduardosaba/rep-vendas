// src/components/catalogo/modals/PasswordModal.tsx

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsPasswordModalOpen(false)}
      />
      {/* Full Screen on mobile, centered on desktop */}
      <div className="relative bg-white w-full h-screen md:h-auto md:max-w-xs md:rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
        <button
          onClick={() => setIsPasswordModalOpen(false)}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:bg-gray-100 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-center pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="mb-6">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Área Restrita</h3>
            <p className="text-sm text-gray-500">
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
            {/* Accessibility: include an (optionally hidden) username field
                so browsers can associate the password correctly. */}
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
              className="w-full p-3 text-center text-lg border rounded-xl outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
              value={passwordInput}
              onChange={(e) => setPasswordInput(String(e.target.value).trimStart())}
            />
          </form>
        </div>

        {/* Footer: Sticky */}
        <div className="sticky bottom-0 p-6 bg-white border-t pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="submit"
            form="password-form"
            disabled={isLoading || !passwordInput.trim()}
            className="w-full py-3 min-h-[44px] bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
