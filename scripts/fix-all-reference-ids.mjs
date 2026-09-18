import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase URL ou Service Role Key ausentes.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CATEGORICAL_TERMS = new Set([
  'sunglasses', 'receituario', 'receituário', 'opt-clip-on', 'opt+clip-on',
  'clip-on', 'clipon', 'solar', 'optico', 'óptico', 'armacao', 'armação',
  'oculos', 'óculos', 'goggles', 'acessorios', 'acessórios', 'opt',
]);

function normalizeKey(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function isCategoricalValue(val) {
  if (!val) return false;
  const normalized = normalizeKey(val);
  if (CATEGORICAL_TERMS.has(normalized)) return true;
  const slugified = normalized.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  return CATEGORICAL_TERMS.has(slugified);
}

function cleanReferenceId(s) {
  if (!s) return '';
  return String(s)
    .trim()
    .replace(/["'«»]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-_]+|[-_]+$/g, '');
}

function extractBaseReferenceFromCode(refCode, color) {
  if (!refCode) return '';
  let str = cleanReferenceId(String(refCode));
  if (!str || isCategoricalValue(str)) return '';

  // 1. Converter hífen antes da cor no final para espaço (ex: MARC 726-086 -> MARC 726 086),
  // mantendo eventuais sufixos de tamanho com hífen (ex: -58, -90) intactos no final.
  str = str.replace(/-([a-zA-Z0-9]{2,5})(-\d{2})?$/, ' $1$2');

  // 2. Se a cor foi informada e o código termina com essa cor (ou cor + tamanho)
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

  // 3. Análise por partes separadas por espaço (mínimo de 3 partes: Marca, Modelo, Cor)
  // Ex: ["MARC", "726", "086-58"] -> "MARC 726"
  // Ex: ["HER", "0411/G/S", "807-90"] -> "HER 0411/G/S"
  // Ex: ["7A", "117", "600-54"] -> "7A 117"
  // Se tiver apenas 2 partes (ex: "7A 117"), NUNCA remover a 2ª parte pois é o modelo!
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

function deriveCleanReferenceId(p) {
  const rawRefId = p.reference_id ? String(p.reference_id).trim() : null;
  const rawRefCode = p.reference_code ? String(p.reference_code).trim() : null;
  const rawName = p.name ? String(p.name).trim() : null;
  const rawColor = p.color ? String(p.color).trim() : null;

  // Fonte primária da verdade: reference_code (contém Marca, Modelo e Cor)
  if (rawRefCode && rawRefCode !== '' && !isCategoricalValue(rawRefCode)) {
    return extractBaseReferenceFromCode(rawRefCode, rawColor);
  }

  // Fallback para reference_id
  if (rawRefId && rawRefId !== '' && !isCategoricalValue(rawRefId)) {
    const cleaned = cleanReferenceId(rawRefId);
    return extractBaseReferenceFromCode(cleaned, rawColor);
  }

  if (rawName && rawName !== '' && !isCategoricalValue(rawName)) {
    return extractBaseReferenceFromCode(rawName, rawColor);
  }

  return 'REF-DESCONHECIDA';
}

function normalizeReferenceCode(refCode) {
  if (!refCode) return '';
  let str = cleanReferenceId(String(refCode));
  if (!str) return '';
  // Substituir hífen pré-código de cor por espaço se estiver gravado como MARC 726-086 -> MARC 726 086
  // Mantém eventuais sufixos de tamanho com hífen no final (ex: -58, -90, -54)
  str = str.replace(/-([a-zA-Z0-9]{2,5})(-\d{2})?$/, ' $1$2');
  return str;
}

async function fixAllReferenceIds() {
  console.log('🔄 Iniciando varredura e correção de reference_code e reference_id na tabela products...\n');

  let page = 0;
  const pageSize = 500;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, reference_id, reference_code, color, name')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('❌ Erro ao consultar produtos:', error);
      break;
    }

    if (!products || products.length === 0) {
      hasMore = false;
      break;
    }

    totalProcessed += products.length;

    for (const p of products) {
      const currentRefCode = p.reference_code ? String(p.reference_code) : '';
      const targetRefCode = currentRefCode ? normalizeReferenceCode(currentRefCode) : '';

      const pWithCleanRefCode = { ...p, reference_code: targetRefCode || currentRefCode };
      const currentRefId = p.reference_id ? String(p.reference_id) : '';
      const targetRefId = deriveCleanReferenceId(pWithCleanRefCode);

      const updatedPayload = {};
      if (currentRefCode && currentRefCode !== targetRefCode) {
        updatedPayload.reference_code = targetRefCode;
      }
      if (currentRefId !== targetRefId) {
        updatedPayload.reference_id = targetRefId;
      }

      if (Object.keys(updatedPayload).length > 0) {
        updatedPayload.updated_at = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from('products')
          .update(updatedPayload)
          .eq('id', p.id);

        if (!updateErr) {
          totalUpdated++;
          console.log(`✅ [${p.id.slice(0, 8)}] ref_code: "${currentRefCode}" -> "${targetRefCode || currentRefCode}" | ref_id: "${currentRefId}" -> "${targetRefId}"`);
        } else {
          console.error(`❌ Erro ao atualizar produto ${p.id}:`, updateErr.message);
        }
      }
    }

    page++;
    if (products.length < pageSize) {
      hasMore = false;
    }
  }

  console.log(`\n✨ Concluído! Total de produtos analisados: ${totalProcessed} | Total de produtos corrigidos: ${totalUpdated}`);
}

fixAllReferenceIds().catch((err) => {
  console.error('❌ Falha na execução do script:', err);
  process.exit(1);
});
