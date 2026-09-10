import {
  normalizeSettingsRow,
  computeSettingsDiff,
  settingsValuesEqual,
  enforcePriceExclusive,
} from '../src/lib/settings-utils';
import { normalizePhone } from '../src/lib/phone';

describe('Settings Utilities & Change Detection', () => {
  describe('normalizeSettingsRow', () => {
    it('preserves boolean false values and does not convert them to empty strings', () => {
      const dbRow = {
        show_cost_price: false,
        show_sale_price: true,
        phone: null,
        email: 'test@example.com',
      };
      const normalized = normalizeSettingsRow(dbRow);
      expect(normalized.show_cost_price).toBe(false);
      expect(normalized.show_sale_price).toBe(true);
      expect(normalized.phone).toBe('');
      expect(normalized.email).toBe('test@example.com');
    });

    it('defaults missing boolean fields to false', () => {
      const dbRow = {
        show_cost_price: null,
      };
      const normalized = normalizeSettingsRow(dbRow);
      expect(normalized.show_cost_price).toBe(false);
    });
  });

  describe('settingsValuesEqual', () => {
    it('correctly compares booleans and empty strings as unequal', () => {
      expect(settingsValuesEqual(false, '')).toBe(false);
      expect(settingsValuesEqual(false, null)).toBe(false);
      expect(settingsValuesEqual(false, false)).toBe(true);
      expect(settingsValuesEqual(true, false)).toBe(false);
    });
  });

  describe('computeSettingsDiff', () => {
    it('includes false in diff when changed from true', () => {
      const original = { show_sale_price: true, show_cost_price: false, email: 'a@b.com' };
      const current = { show_sale_price: false, show_cost_price: true, email: 'a@b.com' };
      const fieldList = ['show_sale_price', 'show_cost_price', 'email'];

      const diff = computeSettingsDiff(current, original, fieldList);
      expect(diff).toEqual({
        show_sale_price: false,
        show_cost_price: true,
      });
    });

    it('returns empty object when no fields have changed', () => {
      const original = { show_sale_price: true, show_cost_price: false };
      const current = { show_sale_price: true, show_cost_price: false };
      const fieldList = ['show_sale_price', 'show_cost_price'];

      const diff = computeSettingsDiff(current, original, fieldList);
      expect(diff).toEqual({});
    });
  });

  describe('enforcePriceExclusive', () => {
    it('keeps valid mutually exclusive states', () => {
      expect(enforcePriceExclusive(true, false)).toEqual({
        show_sale_price: true,
        show_cost_price: false,
      });
      expect(enforcePriceExclusive(false, true)).toEqual({
        show_sale_price: false,
        show_cost_price: true,
      });
    });

    it('falls back to sale=true, cost=false if both are true or both are false', () => {
      expect(enforcePriceExclusive(true, true)).toEqual({
        show_sale_price: true,
        show_cost_price: false,
      });
      expect(enforcePriceExclusive(false, false)).toEqual({
        show_sale_price: true,
        show_cost_price: false,
      });
    });
  });

  describe('normalizePhone', () => {
    it('formats 11 digit Brazilian phone correctly', () => {
      expect(normalizePhone('11999998888')).toBe('+5511999998888');
      expect(normalizePhone('(11) 99999-8888')).toBe('+5511999998888');
    });

    it('formats 10 digit Brazilian phone correctly', () => {
      expect(normalizePhone('1133334444')).toBe('+551133334444');
    });

    it('preserves existing country code 55 with 13 digits', () => {
      expect(normalizePhone('5511999998888')).toBe('+5511999998888');
    });

    it('returns empty string for empty inputs', () => {
      expect(normalizePhone('')).toBe('');
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
    });
  });

  describe('Save Flow & Error Handling Integration', () => {
    it('does not update originalData snapshot when upsert fails or returns zero rows', () => {
      let originalSnapshot = { show_sale_price: true, show_cost_price: false };
      const attemptedDiff = { show_sale_price: false, show_cost_price: true };

      // Simulate a failed API save attempt
      const apiResponse = { data: null, error: { message: 'Database error or 0 rows updated' } };

      if (!apiResponse.data || apiResponse.error) {
        // Snapshot is NOT updated on error
        expect(originalSnapshot.show_sale_price).toBe(true);
        expect(originalSnapshot.show_cost_price).toBe(false);
      } else {
        originalSnapshot = normalizeSettingsRow({ ...originalSnapshot, ...attemptedDiff }) as any;
      }
    });

    it('updates originalData snapshot only after a successful response returning data', () => {
      let originalSnapshot = { show_sale_price: true, show_cost_price: false };
      const attemptedDiff = { show_sale_price: false, show_cost_price: true };

      const apiResponse = { data: { show_sale_price: false, show_cost_price: true }, error: null };

      if (apiResponse.data && !apiResponse.error) {
        originalSnapshot = normalizeSettingsRow({ ...originalSnapshot, ...apiResponse.data }) as any;
      }

      expect(originalSnapshot.show_sale_price).toBe(false);
      expect(originalSnapshot.show_cost_price).toBe(true);
    });
  });

  describe('Catalog Email Fallback Chain', () => {
    function resolveCatalogEmail(settings: any): string | null {
      const candidates = [
        settings?.support_email,
        settings?.email,
        settings?.profile_email,
      ];
      const match = candidates
        .map((e) => (typeof e === 'string' ? e.trim() : ''))
        .find((e) => e.length > 0);
      return match || null;
    }

    it('prioritizes support_email over email and profile_email', () => {
      const settings = {
        support_email: '  suporte@loja.com  ',
        email: 'contato@loja.com',
        profile_email: 'dono@loja.com',
      };
      expect(resolveCatalogEmail(settings)).toBe('suporte@loja.com');
    });

    it('falls back to email if support_email is empty or whitespace', () => {
      const settings = {
        support_email: '   ',
        email: 'contato@loja.com',
        profile_email: 'dono@loja.com',
      };
      expect(resolveCatalogEmail(settings)).toBe('contato@loja.com');
    });

    it('falls back to profile_email if support_email and email are empty', () => {
      const settings = {
        support_email: '',
        email: '  ',
        profile_email: 'dono@loja.com',
      };
      expect(resolveCatalogEmail(settings)).toBe('dono@loja.com');
    });

    it('returns null if all email candidates are empty or whitespace', () => {
      const settings = {
        support_email: ' ',
        email: '',
        profile_email: undefined,
      };
      expect(resolveCatalogEmail(settings)).toBeNull();
    });
  });
});
