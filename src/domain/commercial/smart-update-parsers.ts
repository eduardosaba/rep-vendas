/**
 * Módulo de Parsers e Normalização Estrita para a Torre de Controle
 * 
 * Regras:
 * 1. Não converter valores inválidos automaticamente para 0 ou true (retorna null -> INVALID_ROW)
 * 2. Suportar moeda brasileira (R$ 1.234,56 -> 1234.56)
 * 3. Normalizar Marca + Referência de forma imune a maiúsculas, hífens e espaços sem alterar o banco
 */

export const ALLOWED_TARGET_FIELDS = {
  is_active: 'boolean',
  price: 'currency',
} as const;

export type AllowedTargetField = keyof typeof ALLOWED_TARGET_FIELDS;

export type ProductUpdateMode = 
  | 'DEACTIVATE_ONLY'
  | 'SYNC_BOOLEAN'
  | 'SET_PRICE';

/**
 * Normaliza um texto para comparação interna (caixa alta, apenas a-z 0-9)
 */
export function normalizeKeySegment(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Monta a chave normalizada única MARCA|REFERENCIA
 * Ex: "Moschino" + "MOS652 807" -> "MOSCHINO|MOS652807"
 */
export function buildProductLookupKey(brand: string | null | undefined, referenceCode: string | null | undefined): string {
  const normBrand = normalizeKeySegment(brand);
  const normRef = normalizeKeySegment(referenceCode);
  return `${normBrand}|${normRef}`;
}

/**
 * Parser estrito de moeda e decimais no formato brasileiro
 * Ex: "R$ 1.234,56" -> 1234.56
 * Se for inválido, retorna null (nunca 0)
 */
export function parseBrazilianDecimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  
  const str = String(value).trim();
  if (!str) return null;

  // Remove R$, espaços e símbolos
  const clean = str
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');

  if (!clean) return null;

  let normalized = clean;
  // Trata formato brasileiro: "1.234,56" ou "1234,56"
  if (clean.includes(',') && clean.includes('.')) {
    // "1.234,56" -> remove ponto de milhar, troca vírgula por ponto
    normalized = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // "1234,56" -> troca vírgula por ponto
    normalized = clean.replace(',', '.');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Parser estrito de booleano
 * Retorna true para TRUE/1/SIM/ATIVO
 * Retorna false para FALSE/0/NÃO/INATIVO
 * Retorna null em qualquer outro caso (nunca assume true/false por padrão)
 */
export function parseStrictBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  const str = String(value).trim().toLowerCase();
  if (!str) return null;

  const trueValues = new Set(['true', '1', 'sim', 'ativo', 'ativa', 's', 't']);
  const falseValues = new Set(['false', '0', 'nao', 'não', 'inativo', 'inativa', 'desativado', 'desativada', 'n', 'f']);

  if (trueValues.has(str)) return true;
  if (falseValues.has(str)) return false;

  return null;
}
