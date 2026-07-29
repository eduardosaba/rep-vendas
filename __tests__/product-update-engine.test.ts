import {
  applyStringNormalizations,
  computeStructuredOperation,
  evaluateFilterCondition,
  parsePortugueseCurrencyOrNumber,
} from '../src/modules/product-update-engine/application/parser-utils';
import { getFieldDefinition, UPDATE_FIELD_REGISTRY } from '../src/modules/product-update-engine/domain/field-registry';
import { validateLayerScopeCompatibility } from '../src/modules/product-update-engine/domain/layer-scope-matrix';

describe('Motor de Atualização Inteligente por Planilha — Unit Tests', () => {
  describe('1. Parsing de Valores e Moedas pt-BR', () => {
    it('deve converter corretamente valores em reais pt-BR', () => {
      expect(parsePortugueseCurrencyOrNumber('R$ 1.299,90')).toBe(1299.9);
      expect(parsePortugueseCurrencyOrNumber('1.299,90')).toBe(1299.9);
      expect(parsePortugueseCurrencyOrNumber('1299,90')).toBe(1299.9);
      expect(parsePortugueseCurrencyOrNumber('1299.90')).toBe(1299.9);
      expect(parsePortugueseCurrencyOrNumber('10%')).toBe(10);
      expect(parsePortugueseCurrencyOrNumber('')).toBe(0);
      expect(parsePortugueseCurrencyOrNumber(null)).toBe(0);
    });
  });

  describe('2. Normalização e Preservação de Zeros à Esquerda', () => {
    it('deve preservar zeros à esquerda e aplicar regras de limpeza', () => {
      expect(applyStringNormalizations('  000123  ', ['trim'])).toBe('000123');
      expect(applyStringNormalizations(' rb-3025 ', ['trim', 'uppercase', 'remove_hyphens'])).toBe('RB3025');
      expect(applyStringNormalizations('Ótica São José', ['remove_accents', 'uppercase'])).toBe('OTICA SAO JOSE');
      expect(applyStringNormalizations('Ref.123.45', ['remove_dots'])).toBe('Ref12345');
    });
  });

  describe('3. Avaliação de Filtros Dinâmicos', () => {
    it('deve avaliar operadores de comparação corretamente', () => {
      expect(evaluateFilterCondition('OAKLEY', 'equals', 'OAKLEY')).toBe(true);
      expect(evaluateFilterCondition('Oakley Sunglasses', 'contains', 'oakley')).toBe(true);
      expect(evaluateFilterCondition('100', 'greater_than', '50')).toBe(true);
      expect(evaluateFilterCondition('2026', 'in_list', 'ICONS, 2026, ESSENTIALS')).toBe(true);
      expect(evaluateFilterCondition('', 'is_empty', null)).toBe(true);
      expect(evaluateFilterCondition('Ativo', 'is_not_empty', null)).toBe(true);
    });
  });

  describe('4. Operações Estruturadas', () => {
    it('deve calcular aumentos percentuais e ajustes de preço', () => {
      // 100 + 10% = 110
      expect(computeStructuredOperation(100, 10, 'percentage_increase', 'currency')).toBe(110);
      // 100 - 10% = 90
      expect(computeStructuredOperation(100, 10, 'percentage_decrease', 'currency')).toBe(90);
      // 100 * 1.8 = 180
      expect(computeStructuredOperation(100, 1.8, 'multiply', 'currency')).toBe(180);
      // Impedir preços negativos
      expect(computeStructuredOperation(100, 200, 'subtract', 'currency')).toBe(0);
      // Garantir inteiros para estoque
      expect(computeStructuredOperation(10, 2.5, 'add', 'integer')).toBe(13);
      // Booleans
      expect(computeStructuredOperation(false, 'SIM', 'set', 'boolean')).toBe(true);
      expect(computeStructuredOperation(true, 'false', 'set', 'boolean')).toBe(false);
    });
  });

  describe('5. Whitelist Registry e Matriz de Escopo', () => {
    it('deve validar permissão de campos na Whitelist', () => {
      expect(getFieldDefinition('global', 'sale_price')).not.toBeNull();
      expect(getFieldDefinition('global', 'unauthorized_column')).toBeNull();
    });

    it('deve validar compatibilidade estrita entre Camada e Escopo', () => {
      // Global layer allows GLOBAL scope
      expect(validateLayerScopeCompatibility('global', { type: 'GLOBAL' }).valid).toBe(true);
      // Global layer rejects USER scope
      expect(validateLayerScopeCompatibility('global', { type: 'USER', targetUserIds: ['u-1'] }).valid).toBe(false);
      // Company layer requires targetCompanyIds
      expect(validateLayerScopeCompatibility('company', { type: 'COMPANY', targetCompanyIds: [] }).valid).toBe(false);
      expect(validateLayerScopeCompatibility('company', { type: 'COMPANY', targetCompanyIds: ['c-1'] }).valid).toBe(true);
    });
  });
});
