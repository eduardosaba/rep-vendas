import React from 'react';

type BarcodeProps = {
  value: string;
  height?: number;
  scale?: number; // multiplier for bar width
};

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
}: BarcodeProps) {
  const digits = (value || '').replace(/\D/g, '');

  // Aceita EAN-8 (7 ou 8 dígitos), EAN-13 (12 ou 13 dígitos)
  if (!/^[0-9]{7,13}$/.test(digits)) {
    // fallback: show raw
    return <div className="text-xs text-red-500">EAN inválido</div>;
  }

  // Decide EAN-13 or EAN-8
  if (digits.length === 7 || digits.length === 8) {
    // EAN-8: 7 dígitos (calcular checksum) ou 8 dígitos completos
    let code = digits;
    if (digits.length === 7) code = digits + String(computeChecksum(digits));
    if (code.length !== 8) return <div className="text-xs">{value}</div>;

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
    const bars = [] as React.ReactElement[];
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1')
        bars.push(
          <rect
            key={i}
            x={i * barWidth}
            y={0}
            width={barWidth}
            height={height}
            fill="#000"
          />
        );
    }
    return (
      <svg
        width={svgWidth}
        height={guardHeight}
        viewBox={`0 0 ${svgWidth} ${guardHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100%" height="100%" fill="transparent" />
        {bars}
        <text
          x={svgWidth / 2}
          y={guardHeight - 2}
          fontSize={10}
          textAnchor="middle"
          fill="#000"
          fontFamily="monospace"
        >
          {code}
        </text>
      </svg>
    );
  }

  // EAN-13 flow
  let code = digits;
  if (digits.length === 12) code = digits + String(computeChecksum(digits));
  if (code.length !== 13) return <div className="text-xs">{value}</div>;

  const first = code[0];
  const left = code.slice(1, 7);
  const right = code.slice(7);
  const parity = parityMap[first];

  let pattern = '101';
  for (let i = 0; i < left.length; i++) {
    const d = left[i];
    pattern += parity[i] === 'L' ? L[d] : G[d];
  }
  pattern += '01010';
  for (let i = 0; i < right.length; i++) pattern += R[right[i]];
  pattern += '101';

  const barWidth = Math.max(1, scale);
  // quiet zone (9 modules recommended) to left and right
  const quietModules = 9;
  const quiet = quietModules * barWidth;

  // pattern length in modules (should be 95 for EAN-13)
  const svgWidth = pattern.length * barWidth + quiet * 2;

  // reserve space for guard bars to be slightly taller and for text below
  const textHeight = 12; // space for printed digits
  const guardExtra = 8; // extra height for guard bars
  const svgHeight = height + guardExtra + textHeight;

  const barElements = [] as React.ReactElement[];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      const isGuard = i < 3 || (i >= 45 && i < 50) || i >= pattern.length - 3;
      const h = isGuard ? height + guardExtra : height;
      barElements.push(
        <rect
          key={i}
          x={quiet + i * barWidth}
          y={0}
          width={barWidth}
          height={h}
          fill="#000"
        />
      );
    }
  }

  // Text positions:
  // first digit to the left (in the quiet zone)
  const firstDigitX = quiet / 2;

  // left group digits: start after start guard (3 modules)
  const leftStartIndex = 3; // modules offset inside pattern
  const leftDigitsX = [] as number[];
  for (let i = 0; i < 6; i++) {
    // center of each 7-module block
    const centerModule = leftStartIndex + i * 7 + 3.5;
    leftDigitsX.push(quiet + centerModule * barWidth);
  }

  // right group digits: start at module index 3 + 42 + 5 = 50
  const rightStartIndex = 50;
  const rightDigitsX = [] as number[];
  for (let i = 0; i < 6; i++) {
    const centerModule = rightStartIndex + i * 7 + 3.5;
    rightDigitsX.push(quiet + centerModule * barWidth);
  }

  const textY = height + guardExtra + textHeight * 0.8;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Código de barras ${value}`}
    >
      <rect width="100%" height="100%" fill="transparent" />
      {barElements}

      {/* First digit (left) */}
      <text
        x={firstDigitX}
        y={textY}
        fontSize={10}
        textAnchor="middle"
        fill="#000"
        fontFamily="monospace"
      >
        {first}
      </text>

      {/* Left group digits */}
      {left.split('').map((d, i) => (
        <text
          key={`l-${i}`}
          x={leftDigitsX[i]}
          y={textY}
          fontSize={10}
          textAnchor="middle"
          fill="#000"
          fontFamily="monospace"
        >
          {d}
        </text>
      ))}

      {/* Right group digits */}
      {right.split('').map((d, i) => (
        <text
          key={`r-${i}`}
          x={rightDigitsX[i]}
          y={textY}
          fontSize={10}
          textAnchor="middle"
          fill="#000"
          fontFamily="monospace"
        >
          {d}
        </text>
      ))}
    </svg>
  );
}
