import { enforcePriceExclusive, normalizeSettingsValue } from '../src/lib/settings-utils';

describe('Settings & Display Rules Unit Tests', () => {
  describe('Price Exclusivity (enforcePriceExclusive)', () => {
    it('should default to sale=true, cost=false when both are true', () => {
      const res = enforcePriceExclusive(true, true);
      expect(res).toEqual({ show_sale_price: true, show_cost_price: false });
    });

    it('should default to sale=true, cost=false when both are false', () => {
      const res = enforcePriceExclusive(false, false);
      expect(res).toEqual({ show_sale_price: true, show_cost_price: false });
    });

    it('should preserve sale=true, cost=false', () => {
      const res = enforcePriceExclusive(true, false);
      expect(res).toEqual({ show_sale_price: true, show_cost_price: false });
    });

    it('should preserve sale=false, cost=true', () => {
      const res = enforcePriceExclusive(false, true);
      expect(res).toEqual({ show_sale_price: false, show_cost_price: true });
    });
  });

  describe('Value Normalization (normalizeSettingsValue)', () => {
    it('should clamp/parse numeric fields correctly', () => {
      expect(normalizeSettingsValue('top_benefit_image_scale', '120')).toBe(120);
      expect(normalizeSettingsValue('top_benefit_height', '48')).toBe(48);
      expect(normalizeSettingsValue('cash_price_discount_percent', '5')).toBe(5);
      expect(normalizeSettingsValue('max_installments', '10')).toBe(10);
      expect(normalizeSettingsValue('max_installments', null)).toBeNull();
      expect(normalizeSettingsValue('cash_price_discount_percent', 'invalid')).toBeNull();
    });

    it('should preserve booleans correctly without converting false to null', () => {
      expect(normalizeSettingsValue('show_cost_price', false)).toBe(false);
      expect(normalizeSettingsValue('show_sale_price', true)).toBe(true);
      expect(normalizeSettingsValue('show_cash_discount', false)).toBe(false);
      expect(normalizeSettingsValue('show_installments', true)).toBe(true);
      expect(normalizeSettingsValue('show_top_benefit_bar', null)).toBe(false);
    });
  });

  describe('Cost Mode & Initial Price Visibility Logic', () => {
    function computeCostMode(showCost: boolean, showSale: boolean) {
      return showCost && !showSale;
    }

    it('should determine cost mode only when cost=true and sale=false', () => {
      expect(computeCostMode(true, false)).toBe(true);
      expect(computeCostMode(false, true)).toBe(false);
      expect(computeCostMode(true, true)).toBe(false);
      expect(computeCostMode(false, false)).toBe(false);
    });

    it('should initialize showPrices to true when in sale price mode (!isCostMode)', () => {
      const isCostMode = computeCostMode(false, true); // sale mode
      const initialShowPrices = !isCostMode;
      expect(initialShowPrices).toBe(true);
    });

    it('should initialize showPrices to false when in cost price mode (isCostMode)', () => {
      const isCostMode = computeCostMode(true, false); // cost mode
      const initialShowPrices = !isCostMode;
      expect(initialShowPrices).toBe(false);
    });
  });
});
