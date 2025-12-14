import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Opcional: Logo pequena no meio */}
          </div>
        </div>
        <p className="text-sm text-gray-500 font-medium animate-pulse">
          Carregando informações...
        </p>
      </div>
    </div>
  );
}
