import { toast } from 'sonner';

interface ToastOptions {
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'default';
  duration?: number;
}

// Hook useToast compatível com Sonner e código legado
export function useToast() {
  const addToast = ({
    title,
    description,
    type = 'default',
    duration = 4000,
  }: ToastOptions) => {
    // Garante que 'toast' existe antes de chamar (segurança extra)
    if (typeof toast === 'undefined') {
      console.warn('Sonner toast not initialized');
      return;
    }

    switch (type) {
      case 'success':
        toast.success(title, { description, duration });
        break;
      case 'error':
        toast.error(title, { description, duration });
        break;
      case 'warning':
        toast.warning(title, { description, duration });
        break;
      case 'info':
        toast.info(title, { description, duration });
        break;
      default:
        toast(title, { description, duration });
        break;
    }
  };

  const removeToast = (id?: string | number) => {
    if (typeof toast !== 'undefined') {
      toast.dismiss(id);
    }
  };

  return {
    addToast,
    toast, // Instância original para uso avançado
    removeToast, // Compatibilidade
    toasts: [], // Compatibilidade (array vazio pois Sonner gerencia o estado internamente)
  };
}
