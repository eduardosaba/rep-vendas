import React, { useState } from 'react';
import { APP_WELCOME_VERSION } from '@/hooks/useWelcomeManager';
import { Rocket, Check } from 'lucide-react';

export default function WelcomePopup({
  onConfirm,
  version,
}: {
  onConfirm: () => Promise<void> | void;
  version?: string;
}) {
  const ver = version || APP_WELCOME_VERSION;

  const handleClick = async () => {
    try {
      await onConfirm();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-xl w-full border border-gray-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--primary)]/10 rounded-lg">
            <Rocket className="text-[var(--primary)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Bem-vindo ao RepVendas 🎉
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
              Você está na versão <strong>{ver}</strong>. Veja as novidades e
              atalhos rápidos para começar.
            </p>

            <ul className="mt-4 text-sm text-gray-700 dark:text-slate-300 space-y-2">
              <li>• Gerenciamento de produtos melhorado</li>
              <li>• Uploads e otimizações de imagens</li>
              <li>• Geração de PDF no painel</li>
            </ul>

            <div className="mt-5 flex items-center justify-end">
              <button
                onClick={handleClick}
                className="inline-flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-semibold"
              >
                <Check size={16} /> Fechar e não mostrar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
