'use client'; // OBRIGATÓRIO: Permite o uso de useId e evita erros de compilação no Next.js

import * as React from 'react';
import { useId } from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', label, labelClassName = '', id, name, ...props }, ref) => {
    // Gera um ID único automático (ex: :r1:) se nenhum id for passado via props
    const generatedId = useId();
    const inputId = id || generatedId;
    const inputName = name || inputId;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${labelClassName}`}
          >
            {label}
          </label>
        )}

        <input
          id={inputId}
          name={inputName}
          ref={ref}
          type={type}
          className={`h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';