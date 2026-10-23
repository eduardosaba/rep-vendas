'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, CreditCard, X, LogOut, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BlockedAccountPopupProps {
  onClose?: () => void;
  hardBlock?: boolean;
  reason?: string;
  daysOverdue?: number;
}

export default function BlockedAccountPopup({
  onClose,
  hardBlock = false,
  reason,
  daysOverdue,
}: BlockedAccountPopupProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!hardBlock) {
      const isDismissed = sessionStorage.getItem('blocked_popup_dismissed');
      if (isDismissed) {
        setIsVisible(false);
      }
    } else {
      setIsVisible(true);
    }
  }, [hardBlock]);

  const handleClose = () => {
    if (hardBlock) return; // Bloqueio estrito: impede fechamento
    sessionStorage.setItem('blocked_popup_dismissed', 'true');
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleAction = () => {
    if (!hardBlock) {
      handleClose();
    }
    router.push('/dashboard/fatura');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Erro ao deslogar:', err);
    }
    router.push('/login');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop: se hardBlock for true, clique de fundo NÃO fecha */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={hardBlock ? undefined : handleClose}
      />

      <div className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-red-200 dark:border-red-900/30 animate-in zoom-in duration-300">
        {!hardBlock && (
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6 text-red-600 shadow-inner">
            <Lock size={36} />
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            {hardBlock ? 'Acesso Suspenso' : 'Ativação Necessária'}
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {reason ||
              (hardBlock
                ? 'Seu período de teste expirou e o prazo de tolerância terminou. Para continuar gerindo seus pedidos e catálogos, você precisa ativar sua assinatura.'
                : 'Seu período de teste expirou. Ative sua assinatura para não perder o acesso aos seus catálogos e pedidos.')}
          </p>

          {daysOverdue !== undefined && daysOverdue > 0 && (
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-semibold">
              <AlertTriangle size={14} />
              Vencido há {daysOverdue} dias
            </div>
          )}

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleAction}
              className="flex items-center justify-center gap-2 w-full bg-primary text-white py-4 px-6 rounded-2xl font-bold text-base hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-95"
            >
              <CreditCard size={18} />
              Regularizar Assinatura Agora
            </button>

            {hardBlock ? (
              <button
                onClick={handleLogout}
                className="w-full py-3 text-slate-400 hover:text-red-500 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Sair da conta
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="w-full py-3 text-slate-400 dark:text-slate-500 font-bold text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Lembrar mais tarde
              </button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Pagamento Seguro • InfinitePay
        </p>
      </div>
    </div>
  );
}