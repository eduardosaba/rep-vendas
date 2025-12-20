'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LATEST_UPDATE, LAST_SEEN_VERSION_KEY } from '@/config/updates-config';

/**
 * MODAL DE NOTIFICAÇÃO DE ATUALIZAÇÃO
 *
 * Exibe automaticamente quando:
 * - O usuário faz login no dashboard
 * - A versão do sistema é diferente da última versão vista pelo usuário
 *
 * O controle é feito via localStorage para não aparecer repetidamente
 */
export default function UpdateNotificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Verificar se deve exibir o modal
    const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    const currentVersion = LATEST_UPDATE.version;

    // Exibir apenas se:
    // 1. Nunca viu nenhuma versão (novo usuário)
    // 2. Viu uma versão diferente da atual (atualização)
    if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    // Salvar que o usuário já viu esta versão
    localStorage.setItem(LAST_SEEN_VERSION_KEY, LATEST_UPDATE.version);
    setIsOpen(false);
  };

  // Não renderizar no servidor (SSR)
  if (!mounted || !isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="relative p-6 rounded-t-2xl"
            style={{
              background: 'linear-gradient(to right, #0d1b2c, #b9722e)',
            }}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>

            <div className="text-center text-white">
              {/* Logo centralizada maior (hosted) */}
              <img
                src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
                alt="RepVendas"
                className="w-28 h-28 mx-auto block object-contain"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  const next = img.nextElementSibling as HTMLElement | null;
                  if (next) next.style.display = 'flex';
                  img.style.display = 'none';
                }}
              />
              <div
                className="w-28 h-28 mx-auto rounded-full bg-white/20 hidden items-center justify-center text-lg font-semibold text-slate-900 dark:text-white"
                aria-hidden
              >
                RV
              </div>

              <h2 className="text-2xl font-bold mt-4">{LATEST_UPDATE.title}</h2>
              <p className="text-white/90 text-sm mt-1">
                Versão {LATEST_UPDATE.version} •{' '}
                {new Date(LATEST_UPDATE.date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">
              O que há de novo:
            </h3>

            <ul className="space-y-3 mb-6">
              {LATEST_UPDATE.highlights.map((highlight, index) => {
                // Separa emoji do texto de forma robusta para evitar hydration mismatch
                const emojiMatch = highlight.match(
                  /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u
                );
                const emoji = emojiMatch ? emojiMatch[0].trim() : '✓';
                const text = emojiMatch
                  ? highlight.slice(emojiMatch[0].length)
                  : highlight;

                return (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-slate-700 dark:text-slate-300"
                  >
                    <span className="text-lg mt-0.5">{emoji}</span>
                    <span className="flex-1">{text}</span>
                  </li>
                );
              })}
            </ul>

            {/* Actions */}
            <div className="flex justify-center">
              <button
                onClick={handleClose}
                className="px-8 py-2.5 rounded-lg text-white font-medium transition-all shadow-lg hover:shadow-xl"
                style={{
                  background: 'linear-gradient(to right, #0d1b2c, #b9722e)',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
