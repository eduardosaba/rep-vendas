'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-gray-50 min-h-screen flex items-center justify-center font-sans text-gray-900">
        <div className="max-w-md w-full px-6 py-12 bg-white shadow-2xl rounded-2xl text-center border border-gray-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            Erro Crítico
          </h1>
          <p className="text-gray-500 mb-8">
            O sistema encontrou um problema grave e precisou ser interrompido.
            Por favor, recarregue a aplicação.
          </p>

          <button
            onClick={() => reset()}
            className="rv-btn-primary inline-flex items-center justify-center px-6 py-3 text-base font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
          >
            <RefreshCcw className="mr-2 h-5 w-5" />
            Recarregar Sistema
          </button>
        </div>
      </body>
    </html>
  );
}
