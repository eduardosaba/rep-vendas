'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, CreditCard, X } from 'lucide-react';

export default function BlockedAccountPopup({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  // Se o usuário já fechou nesta sessão, não mostramos novamente para não irritar
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('blocked_popup_dismissed');
    if (isDismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('blocked_popup_dismissed', 'true');
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop com desfoque (blur) para foco total no aviso */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative max-w-sm w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-300">
        
        {/* Botão fechar discreto no canto */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 text-amber-600">
            <Lock size={32} />
          </div>

          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            Ativação Necessária
          </h3>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Seu período de teste expirou. Para continuar gerindo seus pedidos e catálogos, você precisa ativar sua assinatura.
          </p>
          
          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={() => router.push('/dashboard/fatura')}
              className="flex items-center justify-center gap-2 w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <CreditCard size={18} />
              Regularizar Agora
            </button>
            
            <button 
              onClick={handleClose}
              className="w-full py-3 text-slate-400 dark:text-slate-500 font-bold text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Lembrar mais tarde
            </button>
          </div>
        </div>

        {/* Detalhe de segurança no rodapé */}
        <p className="mt-6 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Pagamento Seguro • InfinitePay
        </p>
      </div>
    </div>
  );
}