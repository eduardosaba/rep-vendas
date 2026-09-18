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
    .replace(/["'«»]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-_]+|[-_]+$/g, '');
}

/**
 * Extrai a referência base a partir de um código de referência (reference_code),
 * removendo somente a parte correspondente à cor/variante e tamanho no final.
 * Preserva o formato original da referência base (caixa alta/baixa, espaços, barras /, números).
 * NUNCA transforma em slug nem altera maiúsculas/minúsculas.
 *
 * Exemplos:
 * MARC 726-086          -> MARC 726
 * MARC 726-086-58       -> MARC 726
 * HER 0411/G/S 807-90   -> HER 0411/G/S
 * MJ 1138/S-JRI         -> MJ 1138/S
 * BOSS 1983/S 4C3       -> BOSS 1983/S
 * 7A 117 600-54         -> 7A 117
 */
export function extractBaseReferenceFromCode(
  refCode: string | null | undefined,
  color?: string | null
): string {
  if (!refCode) return '';
  let str = cleanReferenceId(String(refCode));
  if (!str || isCategoricalValue(str)) return '';

  // 1. Converter hífen antes da cor no final para espaço (ex: MARC 726-086 -> MARC 726 086),
  // mantendo eventuais sufixos de tamanho com hífen (ex: -58, -90) intactos no final.
  str = str.replace(/-([a-zA-Z0-9]{2,5})(-\d{2})?$/, ' $1$2');

  // 2. Se a cor foi informada e o código termina com essa cor (ou cor + tamanho no final)
  if (color && String(color).trim() !== '') {
    const cleanColor = cleanReferenceId(String(color));
    if (cleanColor) {
      const colorRegex = new RegExp(
        `[\\s-]+${cleanColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+\\d{2}|-\\d{2})?$`,
        'i'
      );
      if (colorRegex.test(str)) {
        const trimmed = str.replace(colorRegex, '').trim();
        if (trimmed && !isCategoricalValue(trimmed)) {
          return cleanReferenceId(trimmed);
        }
      }
    }
  }

  // 3. Análise de partes baseada em reference_code completo (mínimo de 3 partes: Marca, Modelo, Cor)
  // Ex: ["MARC", "726", "086-58"] -> "MARC 726"
  // Ex: ["HER", "0411/G/S", "807-90"] -> "HER 0411/G/S"
  // Ex: ["7A", "117", "600-54"] -> "7A 117"
  // Se tiver apenas 2 partes (ex: "7A 117", "CA 3036/C"), NUNCA remover a 2ª parte pois ela é o código do modelo!
  const parts = str.split(/\s+/);
  if (parts.length >= 3) {
    let lastIndex = parts.length - 1;
    const isSize = /^(\d{2}(\/\d{2}|-\d{2})?|-\d{2})$/.test(parts[lastIndex]);
    if (isSize && parts.length >= 4) {
      lastIndex--;
    }

    let candidateToken = parts[lastIndex];
    // Se o token da cor tiver tamanho acoplado no final (ex: "807-90" ou "086-58"), ignora o -DD para validar a cor
    candidateToken = candidateToken.replace(/-\d{2}$/, '');

    if (/^[a-zA-Z0-9]{2,5}$/.test(candidateToken) && !candidateToken.includes('/')) {
      const baseParts = parts.slice(0, lastIndex);
      if (baseParts.length >= 2) {
        return cleanReferenceId(baseParts.join(' '));
      }
    }
  }

  return cleanReferenceId(str);
}

export interface DeriveReferenceIdParams {
  ref?: string | null;
  modelCode?: string | null;
  refCode?: string | null;
  name?: string | null;
  color?: string | null;
}

/**
 * Deriva o reference_id correto seguindo as regras funcionais estritas:
 * 
 * 1. Quando uma coluna for Mapeada Explicitamente na planilha (modelCode / reference_id):
 *    -> Salva o conteúdo EXACTAMENTE como informado na célula, aplicando no máximo .trim().
 *    -> NÃO executa slugify, lowercase, remoção de /, nem concatenação com cor.
 * 
 * 2. Quando NENHUMA coluna tiver sido mapeada para reference_id (ou estiver como "não importar"):
 *    -> Deriva a referência base a partir de reference_code (refCode) como fonte primária da verdade.
 *    -> Preserva o formato original da referência base (ex: "7A 117 600" -> "7A 117", "BOSS 1983/S 4C3" -> "BOSS 1983/S").
 */
export function deriveReferenceId(params: DeriveReferenceIdParams): string {
  const { ref, modelCode, refCode, name, color } = params;

  // 1. Tentar modelCode (coluna explicitamente mapeada para Model Code / Reference ID)
  if (modelCode && String(modelCode).trim() !== '' && !isCategoricalValue(modelCode)) {
    return cleanReferenceId(String(modelCode));
  }

  // 2. Fonte principal da verdade para derivação automática: refCode (contém o código completo Marca Modelo Cor)
  if (refCode && String(refCode).trim() !== '' && !isCategoricalValue(refCode)) {
    return extractBaseReferenceFromCode(String(refCode), color);
  }

  // 3. Fallback para REF explicita se não houver refCode
  if (ref && String(ref).trim() !== '' && !isCategoricalValue(ref)) {
    return extractBaseReferenceFromCode(String(ref).trim(), color);
  }

  // 4. Fallback final para name
  if (name && String(name).trim() !== '' && !isCategoricalValue(name)) {
    return extractBaseReferenceFromCode(String(name), color);
  }

  return 'REF-DESCONHECIDA';
}
