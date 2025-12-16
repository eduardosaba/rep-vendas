import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  light?: boolean; // Caso seja usado em fundo escuro
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  light = false,
}) => {
  // Define tamanhos baseados nas props
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  // Define a cor base: usa branco em fundos escuros ou cor primária do tema
  const colorClass = light ? 'text-white' : 'text-[var(--primary)]';

  return (
    <div role="status" className={`${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClass}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span className="sr-only">Carregando...</span>
    </div>
  );
};
