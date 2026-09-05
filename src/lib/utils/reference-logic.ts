/**
 * Módulo de Lógica e Normalização Estrita de Referências (reference_id e reference_code)
 *
 * Garante que valores categóricos como 'sunglasses', 'receituario', 'opt-clip-on'
 * NUNCA sejam gravados em products.reference_id quando existir uma REF válida na planilha.
 */

export const CATEGORICAL_TERMS = new Set([
  'sunglasses',
  'receituario',
  'receituário',
  'opt-clip-on',
  'opt+clip-on',
  'clip-on',
  'clipon',
  'solar',
  'optico',
  'óptico',
  'armacao',
  'armação',
  'oculos',
  'óculos',
  'goggles',
  'acessorios',
  'acessórios',
  'opt',
  'armação receituário',
  'armacao receituario',
  'óculos de sol',
  'oculos de sol',
]);

/**
 * Normaliza um texto removendo acentos, caracteres especiais e convertendo para minúsculas
 */
export function normalizeKey(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica se um valor recebido é estritamente uma categoria/tipo (ex: SUNGLASSES, RECEITUÁRIO, OPT + CLIP-ON)
 */
export function isCategoricalValue(val: string | null | undefined): boolean {
  if (!val) return false;
  const normalized = normalizeKey(val);
  if (CATEGORICAL_TERMS.has(normalized)) return true;

  // Checar variações comuns
  const slugified = normalized.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  if (CATEGORICAL_TERMS.has(slugified)) return true;

  return false;
}

/**
 * Limpa e formata a string de referência preservando notação original de modelos (ex: CA 3036/C, CARRERA 3114/S)
 */
export function cleanReferenceId(s: string): string {
  if (!s) return '';
  return String(s)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-_]+|[-_]+$/g, '');
}

export interface DeriveReferenceIdParams {
  ref?: string | null;
  modelCode?: string | null;
  refCode?: string | null;
  name?: string | null;
}

/**
 * Deriva o reference_id correto seguindo as regras funcionais:
 * 1. Quando a planilha fornecer a coluna REF válida (não-categórica), reference_id É DERIVADO DE REF.
 * 2. Se modelCode for fornecido e NÃO for categórico, usa modelCode.
 * 3. TIPO deve alimentar categoria e NUNCA substituir REF.
 * 4. Jamais utilizar valores como 'sunglasses', 'receituario', 'opt-clip-on' como reference_id.
 */
export function deriveReferenceId(params: DeriveReferenceIdParams): string {
  const { ref, modelCode, refCode, name } = params;

  // 1. Tentar coluna REF explícita
  if (ref && String(ref).trim() !== '' && !isCategoricalValue(ref)) {
    return cleanReferenceId(String(ref));
  }

  // 2. Tentar modelCode (apenas se NÃO for termo categórico)
  if (modelCode && String(modelCode).trim() !== '' && !isCategoricalValue(modelCode)) {
    return cleanReferenceId(String(modelCode));
  }

  // 3. Fallback para refCode
  if (refCode && String(refCode).trim() !== '' && !isCategoricalValue(refCode)) {
    const rawRefCode = String(refCode).trim();
    return cleanReferenceId(rawRefCode);
  }

  // 4. Fallback final para name
  if (name && String(name).trim() !== '' && !isCategoricalValue(name)) {
    return cleanReferenceId(String(name));
  }

  return 'REF-DESCONHECIDA';
}
