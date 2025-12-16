'use client';

import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { useEffect } from 'react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

declare global {
  interface Window {
    __repvendas_showToast?: (args: {
      title: string;
      description?: string;
      type?: 'success' | 'error' | 'warning' | 'info' | 'default';
      duration?: number;
    }) => void;
  }
}

export function Toaster({ ...props }: ToasterProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__repvendas_showToast = ({
        title,
        description,
        type = 'default',
        duration = 4000,
      }) => {
        const toastFn =
          type === 'default'
            ? sonnerToast
            : sonnerToast[type as keyof typeof sonnerToast];
        if (typeof toastFn === 'function') {
          // @ts-ignore
          toastFn(title, { description, duration });
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') delete window.__repvendas_showToast;
    };
  }, []);

  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:dark:bg-slate-900 group-[.toaster]:text-gray-950 group-[.toaster]:dark:text-gray-50 group-[.toaster]:border-gray-200 group-[.toaster]:dark:border-slate-800 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:font-sans',
          description:
            'group-[.toast]:text-gray-500 group-[.toast]:dark:text-gray-400 group-[.toast]:text-sm',

          // AQUI: Usa a cor da marca para o botão de ação
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-white group-[.toast]:font-bold active:scale-95',

          cancelButton:
            'group-[.toast]:bg-gray-100 group-[.toast]:dark:bg-slate-800 group-[.toast]:text-gray-500 group-[.toast]:dark:text-gray-400',

          // Cores semânticas fixas (Padrão UX)
          error:
            'group-[.toaster]:bg-red-50 group-[.toaster]:dark:bg-red-950/30 group-[.toaster]:text-red-700 group-[.toaster]:dark:text-red-400 group-[.toaster]:border-red-200 group-[.toaster]:dark:border-red-900',
          success:
            'group-[.toaster]:bg-emerald-50 group-[.toaster]:dark:bg-emerald-950/30 group-[.toaster]:text-emerald-700 group-[.toaster]:dark:text-emerald-400 group-[.toaster]:border-emerald-200 group-[.toaster]:dark:border-emerald-900',
          warning:
            'group-[.toaster]:bg-amber-50 group-[.toaster]:dark:bg-amber-950/30 group-[.toaster]:text-amber-700 group-[.toaster]:dark:text-amber-400 group-[.toaster]:border-amber-200 group-[.toaster]:dark:border-amber-900',
          info: 'group-[.toaster]:bg-primary/5 group-[.toaster]:dark:bg-primary/30 group-[.toaster]:text-primary group-[.toaster]:dark:text-primary group-[.toaster]:border-primary/10 group-[.toaster]:dark:border-primary/20',
        },
      }}
      {...props}
    />
  );
}
