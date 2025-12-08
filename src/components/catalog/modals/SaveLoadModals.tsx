// src/components/catalog/modals/SaveLoadModals.tsx

'use client';

import React from 'react';
import { Save, Download, Copy, Loader2 } from 'lucide-react';

// --- Tipos de Props Comuns ---
interface BaseModalProps {
  setIsModalOpen: (isOpen: boolean) => void;
}
// ----------------------------

// --- Componente 5.1: SaveCodeModal ---
interface SaveCodeModalProps extends BaseModalProps {
  isSaveModalOpen: boolean;
  savedCode: string | null;
  copyToClipboard: () => void;
}

export function SaveCodeModal({
  isSaveModalOpen,
  setIsModalOpen,
  savedCode,
  copyToClipboard,
}: SaveCodeModalProps) {
  if (!isSaveModalOpen || !savedCode) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsModalOpen(false)}
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Save size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Orçamento Salvo!
        </h3>
        <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-xl mb-6 border border-gray-200">
          <code className="flex-1 text-2xl font-mono font-bold text-gray-800 tracking-wider text-center">
            {savedCode}
          </code>
          <button
            onClick={copyToClipboard}
            className="p-2 text-gray-500 rv-text-primary-hover"
          >
            <Copy size={20} />
          </button>
        </div>
        <button
          onClick={() => setIsModalOpen(false)}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

// --- Componente 5.2: LoadCodeModal ---
interface LoadCodeModalProps extends BaseModalProps {
  isLoadModalOpen: boolean;
  loadCodeInput: string;
  setLoadCodeInput: (code: string) => void;
  handleLoadCart: (e: React.FormEvent) => Promise<void>;
  isLoadingCart: boolean;
}

export function LoadCodeModal({
  isLoadModalOpen,
  setIsModalOpen,
  loadCodeInput,
  setLoadCodeInput,
  handleLoadCart,
  isLoadingCart,
}: LoadCodeModalProps) {
  if (!isLoadModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsModalOpen(false)}
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Carregar Pedido
        </h3>
        <form onSubmit={handleLoadCart} className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Ex: K9P-2X4"
            value={loadCodeInput}
            onChange={(e) => setLoadCodeInput(e.target.value.toUpperCase())}
            className="w-full p-4 text-center text-xl font-mono uppercase tracking-widest rounded-xl border-2 border-gray-200 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoadingCart}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold flex justify-center gap-2"
          >
            {isLoadingCart ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Carregar <Download size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
