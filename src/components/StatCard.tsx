import { LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';

// Interface corrigida para aceitar 'color' e valores numéricos ou string
export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number; // Porcentagem de crescimento/queda
  trendLabel?: string; // Texto explicativo (ex: "vs mês passado")
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | string; // Aceita cores específicas ou string
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
}: StatCardProps) => {
  // Mapa de cores para estilos Tailwind
  const colors: Record<string, string> = {
    blue: 'bg-primary/5 text-primary',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  // Se a cor passada não estiver no mapa, usa azul como fallback
  const colorClass = colors[color] || colors.blue;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
            {value}
          </h3>
        </div>
        <div className={`rounded-lg p-3 ${colorClass} dark:opacity-90`}>
          <Icon size={24} />
        </div>
      </div>

      {/* Se houver tendência, exibe o indicador */}
      {trend !== undefined && (
        <div className="mt-4 flex items-center text-xs">
          <span
            className={`flex items-center font-medium ${trend > 0 ? 'text-green-600 dark:text-green-400' : trend < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-slate-400'}`}
          >
            {trend > 0 ? (
              <ArrowUp size={14} className="mr-1" />
            ) : trend < 0 ? (
              <ArrowDown size={14} className="mr-1" />
            ) : (
              <Minus size={14} className="mr-1" />
            )}
            {Math.abs(trend)}%
          </span>
          <span className="ml-2 text-gray-400 dark:text-slate-500">
            {trendLabel || 'vs mês anterior'}
          </span>
        </div>
      )}
    </div>
  );
};
