'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsVisible(false);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 p-4 shadow-2xl md:hidden animate-in slide-in-from-bottom">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-sm">Instalar App</h3>
          <p className="text-xs text-gray-500">
            Acesse o catálogo mais rápido.
          </p>
        </div>

        {isIOS ? (
          <div className="text-xs text-gray-600 text-right">
            Toque em <strong>Compartilhar</strong> <br /> e{' '}
            <strong>Adicionar à Tela de Início</strong>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
          >
            Instalar
          </button>
        )}

        <button
          onClick={() => setIsVisible(false)}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
