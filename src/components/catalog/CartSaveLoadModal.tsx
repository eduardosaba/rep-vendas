'use client';

import React, { useState } from 'react';
import { X, Save, Download, Copy, Check, Loader2 } from 'lucide-react';

interface SaveResult {
  success: boolean;
  code?: string;
  error?: string;
}

interface LoadResult {
  success: boolean;
  error?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveCart: () => Promise<SaveResult>;
  onLoadCart: (code: string) => Promise<LoadResult>;
  isLoading: boolean;
  cartItemCount: number;
}

export function CartSaveLoadModal({
  isOpen,
  onClose,
  onSaveCart,
  onLoadCart,
  isLoading,
  cartItemCount,
}: Props) {
  const [mode, setMode] = useState<'menu' | 'save' | 'load'>('menu');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    const res = await onSaveCart();
    if (res.success && res.code) {
      setGeneratedCode(res.code);
      setMode('save');
    } else {
      setError(res.error || 'Não foi possível salvar o pedido');
    }
  };

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!inputCode) return;

    const res = await onLoadCart(inputCode);
    if (res.success) {
      onClose();
      setMode('menu'); // Reset para próxima vez
      setInputCode('');
    } else {
      setError(res.error || 'Código não encontrado ou expirado.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAndClose = () => {
    setMode('menu');
    setError('');
    setInputCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">Gerenciar Pedido</h3>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* MENU PRINCIPAL */}
          {mode === 'menu' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleSave}
                disabled={isLoading || cartItemCount === 0}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={32} />
                ) : (
                  <Save
                    size={32}
                    className="group-hover:scale-110 transition-transform"
                  />
                )}
                <span className="font-bold">Salvar Pedido</span>
                <span className="text-xs font-normal text-indigo-500 text-center">
                  Gerar código para continuar depois
                </span>
              </button>

              <button
                onClick={() => setMode('load')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all group"
              >
                <Download
                  size={32}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="font-bold">Carregar Pedido</span>
                <span className="text-xs font-normal text-gray-500 text-center">
                  Tenho um código e quero recuperar itens
                </span>
              </button>
            </div>
          )}

          {/* TELA DE SALVAR (RESULTADO) */}
          {mode === 'save' && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                <Check size={32} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">
                  Pedido Salvo!
                </h4>
                <p className="text-gray-500 text-sm">
                  Use este código para recuperar seu carrinho em qualquer
                  dispositivo.
                </p>
              </div>

              <div className="flex items-center gap-2 p-4 bg-gray-100 rounded-xl border border-gray-200">
                <code className="flex-1 text-2xl font-mono font-bold tracking-wider text-gray-800 text-center select-all">
                  {generatedCode}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 active:scale-95 transition-transform"
                  title="Copiar"
                >
                  {copied ? (
                    <Check size={20} className="text-green-600" />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
              </div>

              <button
                onClick={resetAndClose}
                className="rv-text-primary font-medium hover:underline"
              >
                Fechar e continuar comprando
              </button>
            </div>
          )}

          {/* TELA DE CARREGAR */}
          {mode === 'load' && (
            <form onSubmit={handleLoad} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insira o código do pedido
                </label>
                <input
                  autoFocus
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="EX: X7K9P2"
                  className="w-full p-4 text-center font-mono text-xl uppercase rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-300"
                  maxLength={6}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <X size={14} /> {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('menu');
                    setError('');
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || inputCode.length < 6}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Recuperar'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
