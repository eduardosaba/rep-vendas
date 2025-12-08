/**
 * Hook de toast com fallback para quando ToastProvider não está disponível.
 * Útil para componentes que podem renderizar fora do contexto de ToastProvider.
 */
import { useToast as useToastContext } from './useToast.tsx';

const fallbackToast = {
  addToast: ({ title, description, type = 'default' }: any) => {
    if (typeof window !== 'undefined') {
      // Em produção, simplesmente log. Em dev, você pode usar console
      console.log(`[${type.toUpperCase()}] ${title}`, description || '');
    }
  },
  removeToast: () => undefined,
  toasts: [],
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
