import { normalizeImageForDB } from '../src/lib/imageHelpers';
import { parseStoragePath, normalizeStoragePath, ensure480w } from '../src/lib/imageUtils';

describe('Image Fallback & Resolution Logic Tests', () => {
  describe('normalizeImageForDB', () => {
    test('Cenário A: Variante 480/1200w explicitamente fornecida no path/url', () => {
      const input = {
        url: 'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/product-images/public/brands/polaroid/07886_003-main-1200w.webp',
        path: 'public/brands/polaroid/07886_003-main-1200w.webp',
      };
      const res = normalizeImageForDB(input);

      expect(res).not.toBeNull();
      expect(res?.path).toBe('public/brands/polaroid/07886_003-main-1200w.webp');
      expect(res?.variants).toHaveLength(2);
      expect(res?.variants[0].path).toBe('public/brands/polaroid/07886_003-main-480w.webp');
      expect(res?.variants[1].path).toBe('public/brands/polaroid/07886_003-main-1200w.webp');
    });

    test('Cenário B & C: Imagem original sem sufixo - NÃO DEVE FABRICAR sufixos -480w / -1200w', () => {
      const input = {
        url: 'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/product-images/public/brands/boss/BOSS_1724_S_9G0-00.jpg',
        path: 'public/brands/boss/BOSS_1724_S_9G0-00.jpg',
      };
      const res = normalizeImageForDB(input);

      expect(res).not.toBeNull();
      expect(res?.path).toBe('public/brands/boss/BOSS_1724_S_9G0-00.jpg');
      expect(res?.variants[0].path).toBe('public/brands/boss/BOSS_1724_S_9G0-00.jpg');
      expect(res?.variants[1].path).toBe('public/brands/boss/BOSS_1724_S_9G0-00.jpg');
      // Garantir que não contém o sufixo -480w.webp nem -1200w.webp
      expect(res?.path).not.toContain('-480w.webp');
      expect(res?.path).not.toContain('-1200w.webp');
    });
  });

  describe('parseStoragePath & normalizeStoragePath', () => {
    test('Não deve tratar brands como bucket do Supabase', () => {
      const parsed = parseStoragePath('public/brands/boss/BOSS_1724_S_9G0-00-1200w.webp');
      expect(parsed?.bucket).toBe('product-images');
      expect(parsed?.objectPath).toBe('public/brands/boss/BOSS_1724_S_9G0-00-1200w.webp');
    });

    test('Preserva o prefixo public/ quando faz parte da chave no storage', () => {
      const normalized = normalizeStoragePath('public/brands/tommy-hilfiger/TH_2365_F_9RQ-main-1200w.webp');
      expect(normalized).toBe('public/brands/tommy-hilfiger/TH_2365_F_9RQ-main-1200w.webp');
    });
  });

  describe('ensure480w', () => {
    test('Não altera imagem original para -480w se ela não possuir o sufixo -1200w', () => {
      const original = 'public/brands/boss/BOSS_1724_S_9G0-00.jpg';
      const res = ensure480w(original);
      expect(res).not.toContain('-480w.webp');
    });

    test('Converte variante -1200w para -480w somente se for variante explicitamente declarada', () => {
      const variant1200 = 'public/brands/boss/BOSS_1724_S_9G0-00-1200w.webp';
      const res = ensure480w(variant1200);
      expect(res).toContain('-480w.webp');
    });
  });
});
