'use client';

interface PriceDisplayProps {
  value: number;
  isPricesVisible?: boolean; // <--- AGORA É OPCIONAL
  className?: string;
  size?: 'normal' | 'large';
}

// Helper para formatação
const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

export function PriceDisplay({
  value,
  isPricesVisible = true, // <--- VALOR PADRÃO TRUE
  className = '',
  size = 'normal',
}: PriceDisplayProps) {
  // Ajuste de tamanho responsivo
  const textSize = size === 'large' ? 'text-2xl sm:text-3xl' : 'text-lg';

  if (!isPricesVisible) {
    return (
      <span
        className={`font-mono text-gray-300 tracking-widest ${className} ${
          size === 'large' ? 'text-2xl' : 'text-sm'
        }`}
      >
        R$ ***
      </span>
    );
  }

  return (
    <span className={`${className} ${textSize} tracking-tight`}>
      {formatPrice(value)}
    </span>
  );
}

// Helpers exportados
export const getInstallmentText = (
  price: number,
  maxInstallments: number,
  isPricesVisible: boolean = true // Default true
) => {
  if (!isPricesVisible) return null;
  if (price <= 0 || !maxInstallments || maxInstallments <= 1) return null;

  const installmentValue = price / maxInstallments;

  return (
    <div className="text-[10px] sm:text-xs text-green-600 font-medium mt-0.5">
      ou <span className="font-bold">{maxInstallments}x</span> de{' '}
      <span className="font-bold">{formatPrice(installmentValue)}</span> sem
      juros
    </div>
  );
};

export const getCashDiscountText = (
  price: number,
  discountPercent: number,
  isPricesVisible: boolean = true // Default true
) => {
  if (!isPricesVisible) return null;
  if (!discountPercent || discountPercent <= 0) return null;

  const discountedPrice = price * (1 - discountPercent / 100);

  return (
    <div className="text-[10px] sm:text-xs text-green-700 font-bold mt-1 bg-green-50 px-2 py-1 rounded-sm flex flex-wrap items-center justify-center gap-1">
      <span>{formatPrice(discountedPrice)}</span>
      <span className="opacity-80 font-normal">à vista</span>
      <span className="text-[9px] border border-green-200 px-1 rounded bg-white">
        -{discountPercent}%
      </span>
    </div>
  );
};
