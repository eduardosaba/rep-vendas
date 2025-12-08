'use client';

import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { useEffect } from 'react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  useEffect(() => {
    // Expor fallback global para ser usado por código que não encontra o provider
    try {
      // @ts-ignore
      window.__repvendas_showToast = ({
        title,
        description,
        type = 'default',
        duration = 4000,
      }: any) => {
        if (!sonnerToast) return;
        switch (type) {
          case 'success':
            sonnerToast.success(title, { description, duration });
            break;
          case 'error':
            sonnerToast.error(title, { description, duration });
            break;
          case 'warning':
            sonnerToast.warning(title, { description, duration });
            break;
          case 'info':
            sonnerToast.info(title, { description, duration });
            break;
          default:
            sonnerToast(title, { description, duration });
            break;
        }
      };
    } catch (e) {
      // ignore
    }
    return () => {
      try {
        // @ts-ignore
        delete window.__repvendas_showToast;
      } catch (e) {}
    };
  }, []);
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right" // Posição preferida
      richColors // Cores bonitas para sucesso/erro
      closeButton // Botão de fechar
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:font-sans',
          description: 'group-[.toast]:text-gray-500 group-[.toast]:text-sm',
          actionButton:
            'group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50',
          cancelButton:
            'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500',
          error:
            'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-600 group-[.toaster]:border-red-200',
          success:
            'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-600 group-[.toaster]:border-green-200',
          warning:
            'group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-600 group-[.toaster]:border-yellow-200',
          info: 'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-600 group-[.toaster]:border-blue-200',
        },
      }}
      {...props}
    />
  );
}
