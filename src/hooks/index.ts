// Normaliza e exporta um hook `useToast` que sempre fornece `addToast`.
// Tenta, na ordem: ToastContext (provider), Sonner programmatic, fallback.
import { useToast as useToastContext } from './useToast.tsx';
import { useToastSonner } from './useToastSonner';
import { useToastFallback } from './useToastFallback';
import type { Toast } from '@/lib/types';

export function useToast() {
  try {
    const ctx = useToastContext();
    if (ctx && typeof ctx.addToast === 'function') return ctx;
  } catch (e) {
    // contexto indisponível — continuar para próximos fallbacks
  }

  try {
    const son = useToastSonner();
    if (son && typeof son.addToast === 'function') return son;
  } catch (e) {
    // Sonner direto indisponível — continuar
  }

  try {
    const fallback = useToastFallback();
    if (fallback && typeof fallback.addToast === 'function') return fallback;
  } catch (e) {
    // último recurso abaixo
  }

  // Garantir objeto com addToast funcional mesmo em cenários extremos.
  return {
    addToast: (opts: any) => {
      try {
        // @ts-ignore
        if (
          typeof window !== 'undefined' &&
          (window as any).__repvendas_showToast
        ) {
          // @ts-ignore
          (window as any).__repvendas_showToast(opts);
          return;
        }
      } catch (e) {}
      // Fallback final para não quebrar a execução
      // eslint-disable-next-line no-console
      console.log('toast fallback:', opts);
    },
    removeToast: () => undefined,
    toasts: [] as Toast[],
  };
}

// Exporta outros hooks conforme necessário
export { useSecureCheckout } from './useSecureCheckout';
export { useCatalog } from './useCatalog';
export { useNotifications } from './useNotifications';
