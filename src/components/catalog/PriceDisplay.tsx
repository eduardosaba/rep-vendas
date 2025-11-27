// src/components/catalog/PriceDisplay.tsx

'use client';

interface PriceDisplayProps {
  value: number;
  isPricesVisible: boolean;
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
  isPricesVisible,
  className = '',
  size = 'normal',
}: PriceDisplayProps) {
  const textSize = size === 'large' ? 'text-2xl' : 'text-lg';

  if (!isPricesVisible) {
    return (
      <span
        className={`font-mono text-gray-300 tracking-widest ${className} ${textSize}`}
      >
        R$ ***
      </span>
    );
  }

  return (
    <span className={`${className} ${textSize}`}>{formatPrice(value)}</span>
  );
}

// Função de utilidade para o ProductCard
export const getInstallmentText = (
  price: number,
  maxInstallments: number,
  isPricesVisible: boolean
) => {
  if (!isPricesVisible) return null;
  if (price <= 0 || maxInstallments <= 1) return null;

  const installmentValue = price / maxInstallments;
  return (
    <p className="text-xs text-gray-600 mt-1">
      ou <span className="font-bold">{maxInstallments}x</span> de{' '}
      <span className="font-bold">{formatPrice(installmentValue)}</span> sem
      juros
    </p>
  );
};

export const getCashDiscountText = (
  price: number,
  discountPercent: number,
  isPricesVisible: boolean
) => {
  if (!isPricesVisible) return null;
  if (discountPercent <= 0) return null;

  const discountedPrice = price * (1 - discountPercent / 100);
  return (
    <p className="text-xs text-green-700 font-bold mt-1 bg-green-50 px-2 py-1 rounded-sm flex items-center justify-center">
      <span className="text-sm">{formatPrice(discountedPrice)}</span> à vista (
      {discountPercent}% OFF)
    </p>
  );
};
