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
      // Organization scope validates targetOrganizationIds
      expect(validateLayerScopeCompatibility('global', { type: 'ORGANIZATION', targetOrganizationIds: ['org-1'] }).valid).toBe(true);
    });
  });

  describe('6. Isolamento Multitenant e Validação de Status', () => {
    const mockDbProducts = [
      { id: 'prod-org-A', reference_code: 'TH-100', price: 150, organization_id: 'org-A' },
      { id: 'prod-org-B', reference_code: 'TH-100', price: 150, organization_id: 'org-B' },
      { id: 'prod-org-A-same', reference_code: 'TH-200', price: 200, organization_id: 'org-A' },
    ];

    it('deve filtrar produtos estritamente pela organização selecionada', () => {
      const selectedOrg = 'org-A';
      const scopedProducts = mockDbProducts.filter((p) => p.organization_id === selectedOrg);

      expect(scopedProducts.length).toBe(2);
      expect(scopedProducts.some((p) => p.id === 'prod-org-B')).toBe(false);
      expect(scopedProducts.some((p) => p.id === 'prod-org-A')).toBe(true);
    });

    it('deve atribuir status NO_CHANGE quando o valor do banco for idêntico ao novo valor', () => {
      const currentVal = 200;
      const newVal = computeStructuredOperation(currentVal, 200, 'set', 'currency');

      const isChanged = currentVal !== newVal;
      const status = isChanged ? 'READY' : 'NO_CHANGE';

      expect(newVal).toBe(200);
      expect(status).toBe('NO_CHANGE');
    });

    it('deve atribuir status NOT_FOUND quando o produto não for localizado no escopo da organização', () => {
      const refToFind = 'TH-INEXISTENTE';
      const selectedOrg = 'org-A';
      const matched = mockDbProducts.filter(
        (p) => p.organization_id === selectedOrg && p.reference_code === refToFind
      );

      const status = matched.length > 0 ? 'READY' : 'NOT_FOUND';
      expect(status).toBe('NOT_FOUND');
    });
  });

  describe('7. Torre de Controle — Busca Global por MARCA|REFERÊNCIA e Multitenant', () => {
    const { buildProductLookupKey, normalizeLookupValue } = require('../src/modules/product-update-engine/application/parser-utils');

    it('deve normalizar marca e referência para formar a chave técnica única sem alterar valores originais', () => {
      expect(normalizeLookupValue('Moschino')).toBe('MOSCHINO');
      expect(normalizeLookupValue('MOS652 807')).toBe('MOS652807');
      expect(normalizeLookupValue('MOS652-807')).toBe('MOS652807');
      expect(normalizeLookupValue('MOS176/S 086')).toBe('MOS176S086');

      expect(buildProductLookupKey('Moschino', 'MOS652 807')).toBe('MOSCHINO|MOS652807');
      expect(buildProductLookupKey('MOSCHINO', 'MOS652-807')).toBe('MOSCHINO|MOS652807');
      expect(buildProductLookupKey('moschino', 'MOS652/807')).toBe('MOSCHINO|MOS652807');
      expect(buildProductLookupKey('', 'MOS652807')).toBe('');
    });

    it('deve agrupar e identificar cópias legítimas do mesmo produto em múltiplas organizações', () => {
      const globalMockDb = [
        { id: 'p-1', organization_id: 'org-bahia', brand: 'Moschino', reference_code: 'MOS652-807' },
        { id: 'p-2', organization_id: 'org-sergipe', brand: 'MOSCHINO', reference_code: 'MOS652807' },
        { id: 'p-3', organization_id: 'org-pernambuco', brand: 'Moschino', reference_code: 'MOS652/807' },
        { id: 'p-4', organization_id: 'org-bahia', brand: 'Boss', reference_code: 'BOSS-100' },
      ];

      const lookupMap = new Map<string, any[]>();
      for (const p of globalMockDb) {
        const key = buildProductLookupKey(p.brand, p.reference_code);
        if (!lookupMap.has(key)) lookupMap.set(key, []);
        lookupMap.get(key)!.push(p);
      }

      const targetKey = buildProductLookupKey('Moschino', 'MOS652 807');
      const matched = lookupMap.get(targetKey) || [];

      expect(matched.length).toBe(3);
      const uniqueOrgs = new Set(matched.map((p) => p.organization_id));
      expect(uniqueOrgs.size).toBe(3);
    });

    it('deve identificar ambiguidade apenas quando a mesma organização possuir duplicatas', () => {
      const dbWithAmbiguity = [
        { id: 'p-1', organization_id: 'org-A', brand: 'Moschino', reference_code: 'MOS652 807' },
        { id: 'p-2', organization_id: 'org-A', brand: 'Moschino', reference_code: 'MOS652-807' }, // Duplicata na org A!
        { id: 'p-3', organization_id: 'org-B', brand: 'Moschino', reference_code: 'MOS652807' },  // Válida na org B
      ];

      const orgMap = new Map<string, any[]>();
      for (const p of dbWithAmbiguity) {
        const orgId = p.organization_id;
        if (!orgMap.has(orgId)) orgMap.set(orgId, []);
        orgMap.get(orgId)!.push(p);
      }

      const validOrgs: any[] = [];
      let ambiguousOrgsCount = 0;

      for (const [orgId, prods] of orgMap.entries()) {
        if (prods.length > 1) {
          ambiguousOrgsCount++;
        } else {
          validOrgs.push(prods[0]);
        }
      }

      expect(ambiguousOrgsCount).toBe(1); // org-A é ambígua
      expect(validOrgs.length).toBe(1);    // org-B é válida
      expect(validOrgs[0].organization_id).toBe('org-B');
    });
  });
});

