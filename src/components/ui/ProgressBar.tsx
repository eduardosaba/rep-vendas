import React from 'react';

interface ProgressBarProps {
  value: number; // 0 a 100
  className?: string;
  showLabel?: boolean;
  label?: string; // Texto opcional (ex: "Enviando...", "Processando")
}

export function ProgressBar({
  value,
  className = '',
  showLabel = true,
  label,
}: ProgressBarProps) {
  // Garante limites entre 0 e 100
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  // Define se está concluído
  const isCompleted = pct === 100;

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* Cabeçalho com Label e Porcentagem */}
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-gray-600 dark:text-gray-300">
          <span className="truncate pr-2">{label || 'Progresso'}</span>
          <span
            className={isCompleted ? 'text-green-600 dark:text-green-400' : ''}
          >
            {pct}%
          </span>
        </div>
      )}

      {/* A Barra de Fundo (Trilho) */}
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner border border-gray-100 dark:border-gray-600">
        {/* A Barra de Preenchimento (Líquido) */}
        <div
          className={`
            h-full rounded-full 
            transition-all duration-500 ease-out
            flex items-center justify-end
            ${isCompleted ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-primary shadow-[0_0_10px_var(--primary)]'}
            ${/* Usa a classe semântica bg-primary para cores dinâmicas */ ''}
          `}
          style={{
            width: `${pct}%`,
            // O box-shadow usa a variável primary para dar o brilho da mesma cor
            boxShadow: isCompleted
              ? undefined
              : '0 0 10px var(--primary, #2563eb)',
          }}
        >
          {/* Efeito de brilho interno para dar volume (efeito vidro/glossy) */}
          <div className="w-full h-1/2 bg-white/20 rounded-t-full mb-auto mx-1" />
        </div>
      </div>
    </div>
  );
}

export default ProgressBar;
