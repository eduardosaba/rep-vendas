import { FilterOperator, NormalizerRule, StructuredOperationType } from '../domain/types';

export function parsePortugueseCurrencyOrNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  // Remove currency symbol and spaces
  str = str.replace(/^R\$\s*/i, '').replace(/%\s*$/, '').trim();

  if (!str) return 0;

  // Handle Brazilian format 1.299,90 vs US format 1299.90
  if (str.includes(',') && str.includes('.')) {
    // e.g. 1.299,90 -> remove dots, replace comma with dot
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    // e.g. 1299,90 -> replace comma with dot
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function applyStringNormalizations(val: any, rules: NormalizerRule[]): string {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();

  for (const rule of rules) {
    switch (rule) {
      case 'trim':
        str = str.trim();
        break;
      case 'uppercase':
        str = str.toUpperCase();
        break;
      case 'lowercase':
        str = str.toLowerCase();
        break;
      case 'remove_accents':
        str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        break;
      case 'remove_hyphens':
        str = str.replace(/-/g, '');
        break;
      case 'remove_dots':
        str = str.replace(/\./g, '');
        break;
      case 'remove_invisible':
        str = str.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
        break;
    }
  }

  return str;
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

export function computeStructuredOperation(
  currentVal: any,
  sourceVal: any,
  op: StructuredOperationType,
  targetType: 'boolean' | 'currency' | 'integer' | 'text'
): any {
  if (targetType === 'boolean') {
    if (op === 'set') {
      if (typeof sourceVal === 'boolean') return sourceVal;
      const str = String(sourceVal).trim().toLowerCase();
      return str === 'true' || str === 'sim' || str === '1' || str === 'ativo';
    }
    return Boolean(sourceVal);
  }

  if (targetType === 'text') {
    return String(sourceVal ?? '');
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
    result = 0; // Prevent negative prices or stocks
  }

  if (targetType === 'integer') {
    return Math.round(result);
  }

  return Number(result.toFixed(2));
}
