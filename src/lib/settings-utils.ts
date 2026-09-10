/**
 * Utility functions for Settings change detection and normalization.
 *
 * Key design decisions:
 * - Booleans are NEVER converted to empty string or null during normalization.
 * - `false` is a valid value and must be preserved in payloads and diffs.
 * - Diff comparison uses strict type-aware logic.
 * - The "normalize for initial snapshot" preserves original DB types.
 */

// Fields that are always boolean in the settings table
const BOOLEAN_FIELDS = new Set([
  'show_cost_price',
  'show_sale_price',
  'show_old_price',
  'show_discount',
  'show_shipping',
  'show_filter_price',
  'show_filter_category',
  'show_filter_bestseller',
  'show_filter_new',
  'show_delivery_address_checkout',
  'show_payment_method_checkout',
  'show_installments',
  'show_top_benefit_bar',
  'show_top_info_bar',
  'show_cash_discount',
  'show_pdf_catalog',
  'show_pdf_link',
  'show_headline_overlay',
  'cover_headline_wrap',
  'cover_headline_force_two_lines',
  'enable_stock_management',
  'global_allow_backorder',
  'manage_stock',
  'is_active',
]);

// Fields that are always arrays
const ARRAY_FIELDS = new Set([
  'banners',
  'banners_mobile',
  'gallery_urls',
]);

// Fields that are numeric
const NUMERIC_FIELDS = new Set([
  'top_benefit_image_scale',
  'top_benefit_height',
  'top_benefit_text_size',
  'max_installments',
  'cash_price_discount_percent',
  'cover_headline_font_size',
  'cover_headline_offset_x',
  'cover_headline_offset_y',
  'cover_headline_z_index',
  'cover_image_height',
  'cover_image_offset_x',
  'cover_image_offset_y',
]);

/**
 * Normalize a single value from the database for use as initial state.
 * Unlike the old code, this does NOT convert null to '' for booleans.
 * Booleans remain boolean. Null strings become ''. Null arrays become [].
 */
export function normalizeSettingsValue(key: string, value: unknown): unknown {
  if (BOOLEAN_FIELDS.has(key)) {
    // Preserve boolean type; treat null/undefined as false (DB default)
    if (value === null || value === undefined) return false;
    return Boolean(value);
  }
  if (ARRAY_FIELDS.has(key)) {
    if (Array.isArray(value)) return value;
    return [];
  }
  if (NUMERIC_FIELDS.has(key)) {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  // String/other fields: null → '' to keep inputs controlled
  if (value === null || value === undefined) return '';
  return value;
}

/**
 * Normalize a full settings row from DB for use as initial form state.
 * Returns a new object with types preserved correctly.
 */
export function normalizeSettingsRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    out[key] = normalizeSettingsValue(key, row[key]);
  }
  return out;
}

/**
 * Compare two values for equality in the context of settings diff.
 * Handles booleans, null, '', numbers, arrays, and objects.
 */
export function settingsValuesEqual(a: unknown, b: unknown): boolean {
  // Identical reference or primitive equality
  if (a === b) return true;

  // Both nullish (null/undefined) are treated as equal
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;

  // Type mismatch means not equal (e.g., false vs '' vs null)
  if (typeof a !== typeof b) return false;

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => settingsValuesEqual(v, b[i]));
  }

  // Objects (non-null, non-array)
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Compute the diff between current state and original (snapshot) state.
 * Only returns fields that have actually changed.
 * Does NOT filter out `false` — false is a valid changed value.
 */
export function computeSettingsDiff(
  current: Record<string, unknown>,
  original: Record<string, unknown>,
  fieldList: string[]
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};

  for (const key of fieldList) {
    const currentVal = current[key];
    const originalVal = original[key];

    if (!settingsValuesEqual(currentVal, originalVal)) {
      diff[key] = currentVal;
    }
  }

  return diff;
}

/**
 * Enforce the mutually exclusive rule for show_sale_price / show_cost_price.
 * Exactly one must be true and the other false.
 * Returns the corrected pair.
 */
export function enforcePriceExclusive(
  showSalePrice: unknown,
  showCostPrice: unknown
): { show_sale_price: boolean; show_cost_price: boolean } {
  const sale = Boolean(showSalePrice);
  const cost = Boolean(showCostPrice);

  // If both true or both false, default to sale=true, cost=false
  if (sale === cost) {
    return { show_sale_price: true, show_cost_price: false };
  }

  return { show_sale_price: sale, show_cost_price: cost };
}

/**
 * Dev-only logging for settings debugging.
 * Only logs when NODE_ENV !== 'production'.
 */
export function devLogSettings(label: string, data: unknown): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  try {
    console.log(`[settings:debug] ${label}`, JSON.parse(JSON.stringify(data)));
  } catch {
    console.log(`[settings:debug] ${label}`, data);
  }
}
