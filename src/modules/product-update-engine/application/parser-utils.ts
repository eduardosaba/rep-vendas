import * as crypto from 'crypto';
import { EngineConfiguration, FilterOperator, NormalizerRule, StructuredOperationType } from '../domain/types';
import { normalizeProductKey, buildProductLookupKey as buildKey } from '@/shared/utils/normalize-product-key';

export { normalizeProductKey } from '@/shared/utils/normalize-product-key';

export const IGNORE_FIELD = Symbol('IGNORE_FIELD');

export function normalizeLookupValue(value: unknown): string {
  return normalizeProductKey(value as string | null | undefined);
}

export function buildProductLookupKey(brand: unknown, referenceCode: unknown): string {
  return buildKey(brand as string | null | undefined, referenceCode as string | null | undefined);
}

export function computeConfigHash(config: EngineConfiguration): string {
  const cleanConfig = { ...config };
  delete cleanConfig.configHash;
  return crypto.createHash('sha256').update(JSON.stringify(cleanConfig)).digest('hex');
}

/**
 * Strict Portuguese/English Boolean Parser
 * Returns true, false, or 'INVALID_VALUE'. Does NOT perform silent boolean coercion.
 */
export function parseStrictBoolean(val: any): boolean | 'INVALID_VALUE' {
  if (val === null || val === undefined || String(val).trim() === '') {
    return 'INVALID_VALUE';
  }
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') {
    if (val === 1) return true;
    if (val === 0) return false;
    return 'INVALID_VALUE';
  }

  const str = String(val).trim().toLowerCase();
  const truthy = new Set(['sim', 's', 'true', '1', 'ativo', 'lançamento', 'lancamento', 'yes', 'y', 'on']);
  const falsy = new Set(['não', 'nao', 'n', 'false', '0', 'inativo', 'normal', 'no', 'off']);

  if (truthy.has(str)) return true;
  if (falsy.has(str)) return false;

  return 'INVALID_VALUE';
}

export function parsePortugueseCurrencyOrNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  str = str.replace(/^R\$\s*/i, '').replace(/%\s*$/, '').trim();

  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function applyStringNormalizations(val: any, rules: NormalizerRule[]): string {
  return normalizeProductKey(val, { rules });
}

export function evaluateFilterCondition(rowValue: any, operator: FilterOperator, targetValue: any): boolean {
  if (operator === 'is_empty') {
    return rowValue === null || rowValue === undefined || String(rowValue).trim() === '';
  }
  if (operator === 'is_not_empty') {
    return rowValue !== null && rowValue !== undefined && String(rowValue).trim() !== '';
  }

  if (rowValue === null || rowValue === undefined) return false;

  const strRow = String(rowValue).trim().toLowerCase();
  const strTarget = String(targetValue ?? '').trim().toLowerCase();

  switch (operator) {
    case 'equals':
      if (typeof rowValue === 'boolean' || targetValue === 'true' || targetValue === 'false') {
        return Boolean(rowValue) === (targetValue === 'true' || targetValue === true);
      }
      return strRow === strTarget;
    case 'not_equals':
      return strRow !== strTarget;
    case 'contains':
      return strRow.includes(strTarget);
    case 'not_contains':
      return !strRow.includes(strTarget);
    case 'starts_with':
      return strRow.startsWith(strTarget);
    case 'ends_with':
      return strRow.endsWith(strTarget);
    case 'in_list': {
      const list = Array.isArray(targetValue)
        ? targetValue.map((v) => String(v).trim().toLowerCase())
        : String(targetValue).split(',').map((v) => v.trim().toLowerCase());
      return list.includes(strRow);
    }
    case 'not_in_list': {
      const list = Array.isArray(targetValue)
        ? targetValue.map((v) => String(v).trim().toLowerCase())
        : String(targetValue).split(',').map((v) => v.trim().toLowerCase());
      return !list.includes(strRow);
    }
    case 'greater_than':
      return parsePortugueseCurrencyOrNumber(rowValue) > parsePortugueseCurrencyOrNumber(targetValue);
    case 'greater_equal':
      return parsePortugueseCurrencyOrNumber(rowValue) >= parsePortugueseCurrencyOrNumber(targetValue);
    case 'less_than':
      return parsePortugueseCurrencyOrNumber(rowValue) < parsePortugueseCurrencyOrNumber(targetValue);
    case 'less_equal':
      return parsePortugueseCurrencyOrNumber(rowValue) <= parsePortugueseCurrencyOrNumber(targetValue);
    default:
      return false;
  }
}

/**
 * Computes structured operations on product fields.
 * Respects strict boolean parsing and empty cell ignoring.
 */
import { deriveReferenceId } from '@/lib/utils/reference-logic';

export function computeStructuredOperation(
  currentVal: any,
  sourceVal: any,
  op: StructuredOperationType,
  targetType: 'boolean' | 'currency' | 'integer' | 'text' | 'json' | 'enum' | 'image'
): any {
  // Operação explícita LIMPAR / NULL
  if (op === 'clear') {
    return null;
  }

  // Operação especial: Derivar Referência Base sem cor
  if (op === 'derive_base_reference') {
    const rawVal = sourceVal !== null && sourceVal !== undefined && String(sourceVal).trim() !== ''
      ? String(sourceVal).trim()
      : String(currentVal || '').trim();
    if (!rawVal) return IGNORE_FIELD;
    return deriveReferenceId({ refCode: rawVal });
  }

  // Regra de Ouro: Célula vazia = ignorar campo (NÃO alterar para 0, false ou "")
  if (sourceVal === null || sourceVal === undefined || String(sourceVal).trim() === '') {
    return IGNORE_FIELD;
  }

  if (targetType === 'boolean') {
    if (op === 'set') {
      const parsedBool = parseStrictBoolean(sourceVal);
      if (parsedBool === 'INVALID_VALUE') return 'INVALID_VALUE';
      return parsedBool;
    }
    const parsedBool = parseStrictBoolean(sourceVal);
    return parsedBool === 'INVALID_VALUE' ? 'INVALID_VALUE' : parsedBool;
  }

  if (targetType === 'text' || targetType === 'image' || targetType === 'enum') {
    return String(sourceVal).trim();
  }

  if (targetType === 'json') {
    try {
      if (typeof sourceVal === 'object') return JSON.stringify(sourceVal);
      JSON.parse(String(sourceVal));
      return String(sourceVal).trim();
    } catch {
      return 'INVALID_VALUE';
    }
  }

  const currentNum = parsePortugueseCurrencyOrNumber(currentVal);
  const sourceNum = parsePortugueseCurrencyOrNumber(sourceVal);

  let result = currentNum;

  switch (op) {
    case 'set':
      result = sourceNum;
      break;
    case 'add':
      result = currentNum + sourceNum;
      break;
    case 'subtract':
      result = currentNum - sourceNum;
      break;
    case 'multiply':
      result = currentNum * sourceNum;
      break;
    case 'divide':
      result = sourceNum !== 0 ? currentNum / sourceNum : currentNum;
      break;
    case 'percentage_increase':
      result = currentNum * (1 + sourceNum / 100);
      break;
    case 'percentage_decrease':
      result = currentNum * (1 - sourceNum / 100);
      break;
    case 'round':
      result = Math.round(sourceNum);
      break;
  }

  if (result < 0 && (targetType === 'currency' || targetType === 'integer')) {
    result = 0; // Previne preços ou estoques negativos
  }


  return Number(result.toFixed(2));
}

/**
 * Compara se dois valores são semanticamente iguais para um determinado tipo de campo.
 * Evita atualizações desnecessárias no banco de dados quando o valor atual já for equivalente ao novo valor.
 */
export function areValuesEqual(val1: any, val2: any, fieldType?: string): boolean {
  if (val1 === val2) return true;

  const isVal1Empty = val1 === null || val1 === undefined || String(val1).trim() === '';
  const isVal2Empty = val2 === null || val2 === undefined || String(val2).trim() === '';
  if (isVal1Empty && isVal2Empty) return true;
  if (isVal1Empty !== isVal2Empty) return false;

  if (fieldType === 'currency' || fieldType === 'integer' || typeof val1 === 'number' || typeof val2 === 'number') {
    const n1 = typeof val1 === 'number' ? val1 : parseFloat(String(val1).replace('R$', '').replace(',', '.').trim());
    const n2 = typeof val2 === 'number' ? val2 : parseFloat(String(val2).replace('R$', '').replace(',', '.').trim());
    if (!isNaN(n1) && !isNaN(n2)) {
      return Math.abs(n1 - n2) < 0.0001;
    }
  }

  if (fieldType === 'boolean' || typeof val1 === 'boolean' || typeof val2 === 'boolean') {
    return Boolean(val1) === Boolean(val2);
  }

  return String(val1).trim() === String(val2).trim();
}
