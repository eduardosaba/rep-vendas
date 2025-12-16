'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      isLoading = false,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Estilos Base (Foco, Transição, Layout)
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    // Variantes de Cor (com Dark Mode)
    // O primary usa var(--primary) se disponível, ou fallback para indigo
    const variants = {
      primary:
        'bg-[var(--primary)] text-white hover:opacity-90 focus:ring-[var(--primary)] shadow-sm shadow-[var(--primary)]/20',
      secondary:
        'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 focus:ring-gray-500 dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:hover:bg-slate-700 dark:focus:ring-slate-600',
      outline:
        'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white',
      ghost:
        'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm shadow-red-600/20 dark:bg-red-500 dark:hover:bg-red-400',
    };

    // Tamanhos
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    // Fallback se var(--primary) não estiver definido (usa indigo-600)
    // Isso evita botões invisíveis se o CSS global falhar
    const safeStyle =
      variant === 'primary'
        ? { backgroundColor: 'var(--primary, #4f46e5)' }
        : {};

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        style={safeStyle}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="opacity-90">Carregando...</span>
          </span>
        ) : (
          <span className="inline-flex items-center">
            {leftIcon && (
              <span className="mr-2 -ml-1 opacity-90">{leftIcon}</span>
            )}
            {children}
            {rightIcon && (
              <span className="ml-2 -mr-1 opacity-90">{rightIcon}</span>
            )}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
