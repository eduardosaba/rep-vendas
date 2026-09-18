/**
 * Utilitário seguro para converter valores monetários (PT-BR ou EN) e numéricos em float válido.
 * Trata R$, pontos de milhar, vírgulas decimais, e previne NaN ou conversão acidental para 0.
 */
export function parsePriceToNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim().replace(/^R\$\s*/i, '').replace(/%\s*$/, '').trim();
  if (!str) return 0;

  // Se a string contiver ponto e vírgula (ex: "1.234,56" ou "1,234.56")
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Formato PT-BR: "1.234,56" -> remove ponto de milhar, troca vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato EN: "1,234.56" -> remove vírgula de milhar
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Apenas vírgula: "120,00" -> "120.00"
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
