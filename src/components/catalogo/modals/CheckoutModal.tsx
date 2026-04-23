// src/components/catalogo/modals/CheckoutModal.tsx

'use client';

import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { User, Send, Loader2, X } from 'lucide-react';

interface CheckoutModalProps {
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (isOpen: boolean) => void;
  customerInfo: { name: string; phone: string; email?: string; cnpj?: string };
  setCustomerInfo: (info: {
    name: string;
    phone: string;
    email?: string;
    cnpj?: string;
  }) => void;
  handleFinalizeOrder: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

export function CheckoutModal({
  isCheckoutOpen,
  setIsCheckoutOpen,
  customerInfo,
  setCustomerInfo,
  handleFinalizeOrder,
  isSubmitting,
}: CheckoutModalProps) {
  // Body scroll-lock
  useEffect(() => {
    if (isCheckoutOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCheckoutOpen]);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management + focus trap
  useLayoutEffect(() => {
    if (!isCheckoutOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const modal = modalRef.current;
      if (!modal) return;
      // ensure modal itself is focusable and focused first to steal focus from any open drawer
      modal.tabIndex = -1;
      modal.focus();
      const focusable = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      const first = modal.querySelector<HTMLElement>('#checkout-name') || (focusable[0] as HTMLElement | undefined);
      // small delay to ensure input is interactive in all browsers
      window.requestAnimationFrame(() => first?.focus());
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsCheckoutOpen(false);
        return;
      }

      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    focusFirst();
    // Some UI (cart drawer) may steal focus after modal opens. Retry focusing until success.
    const start = Date.now();
    const interval = window.setInterval(() => {
      const modal = modalRef.current;
      if (!modal) return;
      const active = document.activeElement;
      if (modal.contains(active)) {
        window.clearInterval(interval);
        return;
      }
      // Try focusing again
      modal.focus();
      const preferred = modal.querySelector<HTMLElement>('#checkout-name');
      if (preferred) preferred.focus();
      if (Date.now() - start > 1000) {
        window.clearInterval(interval);
      }
    }, 50);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      // restore focus
      try {
        previouslyFocused.current?.focus();
      } catch (err) {}
    };
  }, [isCheckoutOpen, setIsCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  // Função para atualização parcial do estado do cliente
  const handleCustomerChange = (
    field: 'name' | 'phone' | 'email' | 'cnpj',
    value: string
  ) => {
    setCustomerInfo({ ...customerInfo, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"
        onClick={() => setIsCheckoutOpen(false)}
      />
      {/* Full Screen on mobile, centered on desktop */}
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="relative z-10 bg-white w-full h-screen md:h-auto md:max-w-sm md:rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
        {/* Header: Sticky */}
        <div className="sticky top-0 z-10 p-4 md:p-6 bg-white border-b">
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <h3 id="checkout-title" className="text-xl font-bold text-gray-900">Identifique-se</h3>
          <p className="text-sm text-gray-500 mt-1">
            Informe seus dados para finalizar.
          </p>
        </div>

        {/* Modal Body: Overflow-y-auto */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <form
            id="checkout-form"
            onSubmit={handleFinalizeOrder}
            className="space-y-4"
          >
            {/* Campo Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu Nome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                <input
                  required
                  id="checkout-name"
                  autoFocus
                  type="text"
                  placeholder="Ex: Maria Silva"
                  value={customerInfo.name}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  className="w-full pl-10 p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            {/* Campo Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu Telefone
              </label>
              <input
                required
                type="tel"
                placeholder="(00) 00000-0000"
                value={customerInfo.phone}
                onChange={(e) => handleCustomerChange('phone', e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            {/* Campo Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                required
                type="email"
                placeholder="seu@exemplo.com"
                value={customerInfo.email || ''}
                onChange={(e) => handleCustomerChange('email', e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            {/* Campo CNPJ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ
              </label>
              <input
                required
                placeholder="00.000.000/0000-00"
                value={customerInfo.cnpj || ''}
                onChange={(e) => handleCustomerChange('cnpj', e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </form>
        </div>

        {/* Footer: Sticky */}
        <div className="sticky bottom-0 p-4 md:p-6 bg-white border-t pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting}
            className="w-full py-3 min-h-[44px] rounded-xl text-white font-bold text-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: '#25D366' }}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Finalizar Pedido <Send size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
