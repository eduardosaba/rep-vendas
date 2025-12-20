// Normaliza e exporta um hook `useToast` que sempre fornece `addToast`.
// Tenta, na ordem: ToastContext (provider), Sonner programmatic, fallback.
import { useToast as useToastContext } from './useToast.tsx';
import { useToastSonner } from './useToastSonner';
import { useToastFallback } from './useToastFallback';
import type { Toast } from '@/lib/types';

export function useToast() {
  // Chama os hooks no topo da função (não dentro de callbacks) e escolhe
  // o primeiro que fornecer `addToast`.
  type ToastImpl = {
    addToast?: (opts?: any) => void;
    removeToast?: () => void;
    toasts?: Toast[];
  } | null;

  // Chama os hooks incondicionalmente no topo da função.
  const ctx = useToastContext() as ToastImpl;
  const son = useToastSonner() as ToastImpl;
  const fallbackHook = useToastFallback() as ToastImpl;

  if (ctx && typeof ctx.addToast === 'function') return ctx as any;
  if (son && typeof son.addToast === 'function') return son as any;
  if (fallbackHook && typeof fallbackHook.addToast === 'function')
    return fallbackHook as any;

  // Garantir objeto com addToast funcional mesmo em cenários extremos.
  return {
    addToast: (opts: any) => {
      try {
        // runtime hook bridge (window may expose a helper set at runtime)
        if (
          typeof window !== 'undefined' &&
          (window as any).__repvendas_showToast
        ) {
          (window as any).__repvendas_showToast(opts);
          return;
        }
      } catch (e) {
        // swallow
      }
      // Fallback final para não quebrar a execução

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
