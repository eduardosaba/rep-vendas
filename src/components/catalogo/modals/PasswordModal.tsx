// src/components/catalogo/modals/PasswordModal.tsx

'use client';

import React from 'react';
import { Lock, X } from 'lucide-react';

interface PasswordModalProps {
  isPasswordModalOpen: boolean;
  setIsPasswordModalOpen: (isOpen: boolean) => void;
  passwordInput: string;
  setPasswordInput: (password: string) => void;
  handleUnlockPrices: (e: React.FormEvent) => void;
}

export function PasswordModal({
  isPasswordModalOpen,
  setIsPasswordModalOpen,
  passwordInput,
  setPasswordInput,
  handleUnlockPrices,
}: PasswordModalProps) {
  if (!isPasswordModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsPasswordModalOpen(false)}
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
        <button
          onClick={() => setIsPasswordModalOpen(false)}
          className="absolute top-3 right-3 p-1 rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Área Restrita</h3>
          <p className="text-sm text-gray-500">
            Digite a senha para ver os preços.
          </p>
        </div>
        <form onSubmit={handleUnlockPrices}>
          <input
            type="password"
            autoFocus
            placeholder="Senha"
            className="w-full p-3 text-center text-lg border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
          >
            Desbloquear
          </button>
        </form>
      </div>
    </div>
  );
}
