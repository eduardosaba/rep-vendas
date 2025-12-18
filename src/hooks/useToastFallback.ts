/**
 * Hook de toast com fallback para quando ToastProvider não está disponível.
 * Útil para componentes que podem renderizar fora do contexto de ToastProvider.
 */
import { useToast as useToastContext } from './useToast.tsx';

type FallbackAddToastOpts = {
  title: string;
  description?: string;
  type?: string;
};

const fallbackToast = {
  addToast: ({
    title,
    description,
    type = 'default',
  }: FallbackAddToastOpts) => {
    if (typeof window !== 'undefined') {
      console.log(`[${type.toUpperCase()}] ${title}`, description || '');
    }
  },
  removeToast: () => undefined,
  toasts: [] as unknown[],
};

export function useToastFallback() {
  try {
    // Tenta usar o hook de contexto
    const toast = useToastContext();
    return toast;
  } catch (error) {
    // Ignora erro e usa fallback
  }
  // Sempre retorna um objeto válido com addToast
  return fallbackToast;
}
