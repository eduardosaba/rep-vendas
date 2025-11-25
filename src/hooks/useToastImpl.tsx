'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '@/lib/types';

interface ToastContextData {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((state) => state.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type, duration = 3000 }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2);
      const newToast: Toast = {
        id,
        title,
        description,
        type,
        duration,
      } as Toast;

      setToasts((state) => [...state, newToast]);

      if (duration) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextData {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
