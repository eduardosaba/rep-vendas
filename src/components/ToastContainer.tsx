'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/hooks';
import type { Toast } from '@/lib/types';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getBgColor = (type?: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-primary/5 border-primary/10';
    }
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 sm:right-6 sm:top-8 z-[9999] w-full sm:w-auto max-w-sm sm:max-w-md space-y-3 px-4 sm:px-0">
      {toasts.map((toast: any) => (
        <div
          key={toast.id}
          className={`w-full ${getBgColor(toast.type)} animate-in slide-in-from-right-2 transform rounded-lg border p-4 sm:p-5 shadow-lg transition-all duration-300 ease-in-out`}
          style={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">{getIcon(toast.type)}</div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm sm:text-base font-semibold text-gray-900">
                {toast.title}
              </p>
              {toast.message && (
                <p
                  className="mt-1 text-sm sm:text-base text-gray-700"
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}
                >
                  {toast.message}
                </p>
              )}
            </div>
            <div className="ml-4 flex flex-shrink-0">
              <button
                onClick={() => removeToast(toast.id)}
                className="inline-flex text-gray-400 transition-colors hover:text-gray-600 p-2 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
