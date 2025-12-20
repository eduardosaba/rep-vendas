'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  progress?: number | null; // if provided => show progress bar, otherwise spinner
  className?: string;
}

export function LoadingOverlay({
  show,
  message = 'Aguarde...',
  progress,
  className = '',
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 ${className}`}
    >
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          {typeof progress === 'number' ? (
            <div className="w-full">
              <div className="w-full">
                <ProgressBar value={progress} showLabel={true} />
              </div>
              <div className="text-sm text-gray-700 dark:text-slate-300">
                {message}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <Loader2 className="animate-spin h-8 w-8 text-[var(--primary)]" />
              <div className="text-sm text-gray-700 dark:text-slate-300">
                {message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
