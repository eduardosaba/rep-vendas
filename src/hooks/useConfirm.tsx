'use client';

import { toast } from 'sonner';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export function useConfirm() {
  const confirm = ({
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
  }: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.custom(
        (t) => (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  resolve(false);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t);
                  resolve(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
              >
                {confirmText}
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: 'top-center',
        }
      );
    });
  };

  return { confirm };
}
