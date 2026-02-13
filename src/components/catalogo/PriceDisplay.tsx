'use client';

import React from 'react';

interface PriceDisplayProps {
  value: number;
  isPricesVisible?: boolean;
  className?: string;
  size?: 'small' | 'normal' | 'large';
}

/**
 * PriceDisplay - Exibição de preço com estilo Premium.
 * Divide o preço em partes para destacar os inteiros e reduzir os decimais.
 */
export function PriceDisplay({
  value,
  isPricesVisible = true,
  className = '',
  size = 'normal',
}: PriceDisplayProps) {
  // Caso os preços estejam bloqueados (ex: área restrita com senha)
  if (!isPricesVisible) {
    return (
      <span className={`text-gray-300 font-mono tracking-tighter ${className}`}>
        R$ •••
      </span>
    );
  }

  // Configuramos o formatador para a moeda brasileira
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  // Transformamos o valor num array de partes (moeda, inteiro, separador, decimal)
  const parts = formatter.formatToParts(value);

  return (
    <div
      className={`inline-flex items-baseline font-sans leading-none ${className}`}
    >
      {parts.map((part, index) => {
        // 1. Símbolo da Moeda (R$) - Exibido menor e com menos brilho
        if (part.type === 'currency') {
          return (
            <span
              key={index}
              className="text-[0.6em] font-medium mr-1 opacity-70"
            >
              {part.value}
            </span>
          );
        }

        // 2. Inteiros (1.234) - O foco principal, negrito e grande
        if (part.type === 'integer' || part.type === 'group') {
          const integerClass =
            size === 'large'
              ? 'text-2xl sm:text-3xl font-black'
              : size === 'small'
                ? 'text-sm sm:text-base font-semibold'
                : 'text-base sm:text-lg font-bold';
          return (
            <span key={index} className={`${integerClass} tracking-tight`}>
              {part.value}
            </span>
          );
        }

        // 3. Decimais (,50) - Exibidos menores para "aligeirar" o valor visualmente
        if (part.type === 'decimal' || part.type === 'fraction') {
          return (
            <span key={index} className="text-[0.7em] font-bold opacity-80">
              {part.value}
            </span>
          );
        }

        return <span key={index}>{part.value}</span>;
      })}
    </div>
  );
}

/**
 * Helper para gerar o texto de parcelamento utilizando o novo componente de preço.
 */
export const getInstallmentText = (
  price: number,
  maxInstallments: number,
  isPricesVisible: boolean = true
) => {
  if (
    !isPricesVisible ||
    price <= 0 ||
    !maxInstallments ||
    maxInstallments <= 1
  )
    return null;

  const installmentValue = price / maxInstallments;

  return (
    <div className="text-[10px] sm:text-xs text-green-600 font-medium mt-0.5 flex items-baseline gap-1">
      ou <span className="font-bold">{maxInstallments}x</span> de
      <PriceDisplay
        value={installmentValue}
        className="text-green-600 font-bold"
      />
      <span className="text-[9px]">sem juros</span>
    </div>
  );
};

/**
 * Helper para gerar o badge de desconto à vista utilizando o novo componente de preço.
 */
export const getCashDiscountText = (
  price: number,
  discountPercent: number,
  isPricesVisible: boolean = true
) => {
  if (!isPricesVisible || !discountPercent || discountPercent <= 0) return null;

  const discountedPrice = price * (1 - discountPercent / 100);

  return (
    <div className="mt-1 inline-flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-md border border-green-100 shadow-sm">
      <PriceDisplay
        value={discountedPrice}
        className="text-green-700 font-black"
      />
      <div className="flex flex-col items-start leading-[1]">
        <span className="text-[9px] text-green-600 font-bold uppercase">
          À VISTA
        </span>
        <span className="text-[8px] text-green-500 font-medium">
          -{discountPercent}% OFF
        </span>
      </div>
    </div>
  );
};
