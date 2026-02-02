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
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 appearance-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] active:opacity-95';

    // Variantes de Cor (com Dark Mode)
    // O primary usa var(--primary) se disponível, ou fallback para indigo
    const variants = {
      primary:
        'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 focus:ring-[var(--primary)] shadow-sm shadow-[var(--primary)]/20',
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

    // Fallbacks inline por variante para evitar texto/invisível
    // quando variáveis CSS não estiverem definidas ou classes forem sobrescritas
    const safeStyle: React.CSSProperties = (() => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--primary, #b9722e)',
            color: 'var(--primary-foreground, #ffffff)',
          };
        case 'secondary':
          return {
            backgroundColor: 'var(--secondary, #ffffff)',
            color: 'var(--secondary-foreground, #111827)',
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--outline-foreground, #374151)',
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--ghost-foreground, #374151)',
          };
        case 'danger':
          return {
            backgroundColor: 'var(--danger, #dc2626)',
            color: 'var(--danger-foreground, #ffffff)',
          };
        default:
          return {};
      }
    })();

    // Merge estilo seguro com estilo passado via props (props.style tem precedência)
    const incomingStyle = (props.style as React.CSSProperties) || {};
    const styleObj: React.CSSProperties = { ...safeStyle, ...incomingStyle };

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        style={styleObj}
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
