import {
  parseBrazilianDecimal,
  parseStrictBoolean,
  normalizeKeySegment,
  buildProductLookupKey,
} from '@/domain/commercial/smart-update-parsers';

describe('Smart Product Update Parsers & Normalizers', () => {
  describe('normalizeKeySegment & buildProductLookupKey', () => {
    it('deve normalizar strings removendo acentos, hífens, barras e espaços', () => {
      expect(normalizeKeySegment('Moschino')).toBe('MOSCHINO');
      expect(normalizeKeySegment('MOS652 807')).toBe('MOS652807');
      expect(normalizeKeySegment('MOS176/S 086')).toBe('MOS176S086');
      expect(normalizeKeySegment('MOS-652-C9B')).toBe('MOS652C9B');
    });

    it('deve montar a chave composta única MARCA|REFERENCIA', () => {
      const key = buildProductLookupKey('Moschino', 'MOS652 807');
      expect(key).toBe('MOSCHINO|MOS652807');
    });
  });

  describe('parseBrazilianDecimal', () => {
    it('deve converter formato de moeda brasileira para número válido', () => {
      expect(parseBrazilianDecimal('R$ 1.234,56')).toBe(1234.56);
      expect(parseBrazilianDecimal('1234,56')).toBe(1234.56);
      expect(parseBrazilianDecimal('299.90')).toBe(299.9);
      expect(parseBrazilianDecimal(150.5)).toBe(150.5);
    });

    it('deve retornar null para valores não numéricos ou inválidos (jamais 0)', () => {
      expect(parseBrazilianDecimal('abc')).toBeNull();
      expect(parseBrazilianDecimal('')).toBeNull();
      expect(parseBrazilianDecimal(undefined)).toBeNull();
      expect(parseBrazilianDecimal(null)).toBeNull();
      expect(parseBrazilianDecimal(NaN)).toBeNull();
    });
  });

  describe('parseStrictBoolean', () => {
    it('deve reconhecer corretamente entradas válidas para true', () => {
      expect(parseStrictBoolean('TRUE')).toBe(true);
      expect(parseStrictBoolean('true')).toBe(true);
      expect(parseStrictBoolean('1')).toBe(true);
      expect(parseStrictBoolean(1)).toBe(true);
      expect(parseStrictBoolean('SIM')).toBe(true);
      expect(parseStrictBoolean('ATIVO')).toBe(true);
      expect(parseStrictBoolean(true)).toBe(true);
    });

    it('deve reconhecer corretamente entradas válidas para false', () => {
      expect(parseStrictBoolean('FALSE')).toBe(false);
      expect(parseStrictBoolean('false')).toBe(false);
      expect(parseStrictBoolean('0')).toBe(false);
      expect(parseStrictBoolean(0)).toBe(false);
      expect(parseStrictBoolean('NÃO')).toBe(false);
      expect(parseStrictBoolean('NAO')).toBe(false);
      expect(parseStrictBoolean('INATIVO')).toBe(false);
      expect(parseStrictBoolean(false)).toBe(false);
    });

    it('deve retornar null para entradas ambíguas ou inválidas (jamais true/false por padrão)', () => {
      expect(parseStrictBoolean('qualquer texto')).toBeNull();
      expect(parseStrictBoolean('X')).toBeNull();
      expect(parseStrictBoolean('')).toBeNull();
      expect(parseStrictBoolean(undefined)).toBeNull();
      expect(parseStrictBoolean(null)).toBeNull();
    });
  });
});
