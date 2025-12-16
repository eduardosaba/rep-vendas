// src/components/catalogo/modals/SaveLoadModals.tsx

'use client';

import React, { useEffect } from 'react';
import { Save, Download, Copy, Loader2, X } from 'lucide-react';

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
  // Body scroll-lock
  useEffect(() => {
    if (isSaveModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSaveModalOpen]);

  if (!isSaveModalOpen || !savedCode) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsModalOpen(false)}
      />
      {/* Full Screen on mobile, centered on desktop */}
      <div className="relative bg-white w-full h-screen md:h-auto md:max-w-sm md:rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
        <button
          onClick={() => setIsModalOpen(false)}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-center pb-[calc(env(safe-area-inset-bottom)+1rem)]">
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
        </div>

        {/* Footer: Sticky */}
        <div className="sticky bottom-0 p-6 bg-white border-t pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            onClick={() => setIsModalOpen(false)}
            className="w-full py-3 min-h-[44px] bg-gray-900 text-white rounded-xl font-bold"
          >
            Entendi
          </button>
        </div>
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
  // Body scroll-lock
  useEffect(() => {
    if (isLoadModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLoadModalOpen]);

  if (!isLoadModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsModalOpen(false)}
      />
      {/* Full Screen on mobile, centered on desktop */}
      <div className="relative bg-white w-full h-screen md:h-auto md:max-w-sm md:rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
        <button
          onClick={() => setIsModalOpen(false)}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Carregar Pedido
          </h3>
          <form
            id="load-cart-form"
            onSubmit={handleLoadCart}
            className="space-y-4"
          >
            <input
              autoFocus
              type="text"
              placeholder="Ex: K9P-2X4"
              value={loadCodeInput}
              onChange={(e) => setLoadCodeInput(e.target.value.toUpperCase())}
              className="w-full p-4 text-center text-xl font-mono uppercase tracking-widest rounded-xl border-2 border-gray-200 outline-none focus:border-primary"
            />
          </form>
        </div>

        {/* Footer: Sticky */}
        <div className="sticky bottom-0 p-6 bg-white border-t pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="submit"
            form="load-cart-form"
            disabled={isLoadingCart}
            className="w-full py-3 min-h-[44px] rounded-xl bg-primary text-white font-bold flex justify-center items-center gap-2"
          >
            {isLoadingCart ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Carregar <Download size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
