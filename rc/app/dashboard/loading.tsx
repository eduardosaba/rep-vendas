import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-950 transition-colors">
      <div className="flex flex-col items-center gap-3 p-6">
        <Loader2
          className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400"
          strokeWidth={2.5}
        />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
          Carregando...
        </p>
      </div>
    </div>
  );
}
