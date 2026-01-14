import React from 'react';

type BarcodeProps = {
  value: string;
  height?: number;
  scale?: number;
  showNumber?: boolean;
  className?: string;
};

// ... (Mapas L, G, R, parityMap e função computeChecksum mantidos IGUAIS para brevidade, pois a lógica estava correta) ...
const L: Record<string, string> = {
  '0': '0001101',
  '1': '0011001',
  '2': '0010011',
  '3': '0111101',
  '4': '0100011',
  '5': '0110001',
  '6': '0101111',
  '7': '0111011',
  '8': '0110111',
  '9': '0001011',
};
const G: Record<string, string> = {
  '0': '0100111',
  '1': '0110011',
  '2': '0011011',
  '3': '0100001',
  '4': '0011101',
  '5': '0111001',
  '6': '0000101',
  '7': '0010001',
  '8': '0001001',
  '9': '0010111',
};
const R: Record<string, string> = {
  '0': '1110010',
  '1': '1100110',
  '2': '1101100',
  '3': '1000010',
  '4': '1011100',
  '5': '1001110',
  '6': '1010000',
  '7': '1000100',
  '8': '1001000',
  '9': '1110100',
};
const parityMap: Record<string, string> = {
  '0': 'LLLLLL',
  '1': 'LLGLGG',
  '2': 'LLGGLG',
  '3': 'LLGGGL',
  '4': 'LGLLGG',
  '5': 'LGGLLG',
  '6': 'LGGGLL',
  '7': 'LGLGLG',
  '8': 'LGLGGL',
  '9': 'LGGLGL',
};

function computeChecksum(code: string) {
  const nums = code.split('').map((c) => parseInt(c, 10));
  let sum = 0;
  for (let i = nums.length - 1, pos = 0; i >= 0; i--, pos++) {
    const weight = pos % 2 === 0 ? 3 : 1;
    sum += nums[i] * weight;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

export default function Barcode({
  value,
  height = 40,
  scale = 1,
  showNumber = true,
  className = '',
}: BarcodeProps) {
  const digits = (value || '').replace(/\D/g, '');

  // If no value provided, render nothing (don't show 'invalid' for absent barcode)
  if (!digits || digits.length === 0) return null;

  // If a value is provided but doesn't match expected EAN lengths, show invalid
  if (!/^[0-9]{7,13}$/.test(digits)) {
    return (
      <div className="text-xs text-red-500 font-mono bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded inline-block">
        EAN inválido
      </div>
    );
  }

  // Sempre preto para garantir leitura por scanners
  const barColor = '#000000';

  // Lógica de Renderização EAN-8/13 Unificada para SVG
  const renderBarcode = () => {
    // ... (Lógica de EAN-8 mantida, apenas retornando o SVG limpo) ...
    if (digits.length === 7 || digits.length === 8) {
      let code = digits;
      if (digits.length === 7) code = digits + String(computeChecksum(digits));

      const left = code.slice(0, 4);
      const right = code.slice(4);
      let pattern = '101';
      for (let i = 0; i < left.length; i++) pattern += L[left[i]];
      pattern += '01010';
      for (let i = 0; i < right.length; i++) pattern += R[right[i]];
      pattern += '101';

      const barWidth = Math.max(1, scale);
      const svgWidth = pattern.length * barWidth;
      const guardHeight = height + 8;

      return (
        <svg
          width={svgWidth}
          height={guardHeight}
          viewBox={`0 0 ${svgWidth} ${guardHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {pattern
            .split('')
            .map(
              (bit, i) =>
                bit === '1' && (
                  <rect
                    key={i}
                    x={i * barWidth}
                    y={0}
                    width={barWidth}
                    height={height}
                    fill={barColor}
                  />
                )
            )}
          {showNumber && (
            <text
              x={svgWidth / 2}
              y={guardHeight - 2}
              fontSize={10}
              textAnchor="middle"
              fill={barColor}
              fontFamily="monospace"
            >
              {code}
            </text>
          )}
        </svg>
      );
    }

    // EAN-13
    let code = digits;
    if (digits.length === 12) code = digits + String(computeChecksum(digits));

    const first = code[0];
    const left = code.slice(1, 7);
    const right = code.slice(7);
    const parity = parityMap[first];

    let pattern = '101';
    for (let i = 0; i < left.length; i++)
      pattern += parity[i] === 'L' ? L[left[i]] : G[left[i]];
    pattern += '01010';
    for (let i = 0; i < right.length; i++) pattern += R[right[i]];
    pattern += '101';

    const barWidth = Math.max(1, scale);
    const quiet = 9 * barWidth;
    const svgWidth = pattern.length * barWidth + quiet * 2;
    const svgHeight = height + 20;

    return (
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {pattern.split('').map((bit, i) => {
          if (bit === '0') return null;
          const isGuard =
            i < 3 || (i >= 45 && i < 50) || i >= pattern.length - 3;
          return (
            <rect
              key={i}
              x={quiet + i * barWidth}
              y={0}
              width={barWidth}
              height={isGuard ? height + 8 : height}
              fill={barColor}
            />
          );
        })}
        {showNumber && (
          <g style={{ fontFamily: 'monospace', fontSize: 10 }} fill={barColor}>
            <text x={quiet / 2} y={svgHeight - 5} textAnchor="middle">
              {first}
            </text>
            {left.split('').map((d, i) => (
              <text
                key={`l-${i}`}
                x={quiet + (3 + i * 7 + 3.5) * barWidth}
                y={svgHeight - 5}
                textAnchor="middle"
              >
                {d}
              </text>
            ))}
            {right.split('').map((d, i) => (
              <text
                key={`r-${i}`}
                x={quiet + (50 + i * 7 + 3.5) * barWidth}
                y={svgHeight - 5}
                textAnchor="middle"
              >
                {d}
              </text>
            ))}
          </g>
        )}
      </svg>
    );
  };

  return renderBarcode();
}
