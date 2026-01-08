'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Inicializa com estado atual
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Remove badge de reconexão após 3s
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Não mostra nada se estiver online e não acabou de reconectar
  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl font-bold text-sm transition-all duration-300 ${
        isOnline
          ? 'bg-green-500 text-white animate-in slide-in-from-bottom-4'
          : 'bg-red-500 text-white animate-in slide-in-from-bottom-4'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi size={18} className="animate-pulse" />
          <span>Conexão Restaurada</span>
        </>
      ) : (
        <>
          <WifiOff size={18} />
          <span>Modo Offline</span>
        </>
      )}
    </div>
  );
}
