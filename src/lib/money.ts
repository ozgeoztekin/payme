import { CURRENCY_EXPONENTS, DEFAULT_CURRENCY } from '@/lib/constants';

/**
 * Normalize a raw user-typed string into a canonical decimal string (dot as
 * decimal separator, no grouping characters).
 *
 * Strategy: treat the *last* separator (`.` or `,`) as the decimal separator
 * and everything before it as grouping noise — except when the last group has
 * exactly 3 digits and there is only one separator type, in which case it's
 * ambiguous and we treat it as grouping (e.g. "1.000" → 1000, not 1.0).
 *
 * Returns `null` when the input is clearly invalid (letters, multiple decimal
 * parts after normalization, etc.).
 */
export function normalizeMoneyInput(raw: string): string | null {
  let s = raw.trim();
  if (s === '') return '';

  // Strip currency symbols, spaces, and other non-numeric noise
  s = s.replace(/[^0-9.,]/g, '');
  if (s === '') return null;

  const dots = s.split('.').length - 1;
  const commas = s.split(',').length - 1;

  // No separators at all — pure integer
  if (dots === 0 && commas === 0) return s;

  // Only dots
  if (commas === 0) {
    if (dots === 1) {
      const afterDot = s.split('.')[1];
      // Exactly 3 digits after dot → grouping (e.g. "1.000" = 1000)
      if (afterDot.length === 3) return s.replace('.', '');
      return s;
    }
    // Multiple dots — grouping (e.g. "1.000.500") → strip all dots
    return s.replace(/\./g, '');
  }

  // Only commas
  if (dots === 0) {
    if (commas === 1) {
      const afterComma = s.split(',')[1];
      // Exactly 3 digits after comma → grouping (e.g. "1,000" = 1000)
      if (afterComma.length === 3) return s.replace(',', '');
      return s.replace(',', '.');
    }
    // Multiple commas — grouping (e.g. "1,000,500") → strip all commas
    return s.replace(/,/g, '');
  }

  // Mixed separators — last separator wins as the decimal separator
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot > lastComma) {
    // "1,000.50" style → commas are grouping, dot is decimal
    return s.replace(/,/g, '');
  }

  // "1.000,50" style → dots are grouping, comma is decimal
  return s.replace(/\./g, '').replace(',', '.');
}

/**
 * Format a canonical decimal string (no grouping, dot-decimal) into USD
 * display format with thousands separators and a proper decimal point.
 *
 * During live typing we keep the user's trailing dot / partial fraction
 * intact so they can keep typing.
 */
export function formatUsdLive(canonical: string): string {
  if (canonical === '' || canonical === '0') return canonical;

  const hasTrailingDot = canonical.endsWith('.');
  const parts = canonical.split('.');
  const intPart = parts[0] || '0';
  const fracPart = parts[1]; // may be undefined

  // Add thousands separators to integer part
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (hasTrailingDot) return `${withCommas}.`;
  if (fracPart !== undefined) return `${withCommas}.${fracPart}`;
  return withCommas;
}

/**
 * Format a canonical decimal string on blur: pad fraction to 2 digits if
 * there is any fractional part, strip trailing dot.
 */
export function formatUsdBlur(canonical: string): string {
  if (canonical === '') return '';

  const parts = canonical.split('.');
  const intPart = parts[0] || '0';
  const fracPart = parts[1];

  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (fracPart !== undefined && fracPart.length > 0) {
    return `${withCommas}.${fracPart.padEnd(2, '0')}`;
  }

  return withCommas;
}

/**
 * Validate and constrain a canonical decimal string for USD entry.
 * Returns `null` to reject the input (caller should keep previous value).
 */
export function validateUsdInput(canonical: string): string | null {
  if (canonical === '') return '';

  // Must be digits, at most one dot, at most 2 fraction digits
  if (!/^\d*\.?\d{0,2}$/.test(canonical)) return null;

  // Strip leading zeros (but keep "0" and "0.xx")
  const cleaned = canonical.replace(/^0+(\d)/, '$1');
  return cleaned;
}

/**
 * Parse a display-style USD string (may contain commas, dots, or comma-as-decimal)
 * into integer minor units (cents). Returns 0 for empty/unparseable input.
 */
export function parseUsdToMinor(displayValue: string): number {
  const canonical = normalizeMoneyInput(displayValue);
  if (!canonical) return 0;

  const num = parseFloat(canonical);
  if (isNaN(num)) return 0;

  const exponent = CURRENCY_EXPONENTS[DEFAULT_CURRENCY] ?? 2;
  return Math.round(num * 10 ** exponent);
}

/**
 * Parse a display-string to integer minor units for an arbitrary currency.
 * Re-export so callers that already import from money.ts don't also need utils.ts.
 */
export function parseAmountToMinor(value: string, currency: string = DEFAULT_CURRENCY): number {
  const canonical = normalizeMoneyInput(value);
  if (!canonical) return 0;

  const num = parseFloat(canonical);
  if (isNaN(num)) return 0;

  const exponent = CURRENCY_EXPONENTS[currency] ?? 2;
  return Math.round(num * 10 ** exponent);
}

/**
 * Normalize for live typing context: commas in the raw value are either our
 * own thousands-formatting or a locale decimal separator typed by the user.
 * A dot is always the decimal separator when typed by the user.
 *
 * Strategy: if the value contains both commas and a dot, commas are grouping
 * (our formatter put them there). If only commas, a single comma with <=2
 * digits after it is treated as a locale decimal; otherwise grouping. A dot
 * is always decimal.
 */
function normalizeForTyping(raw: string): string | null {
  let s = raw.replace(/[^0-9.,]/g, '');
  if (s === '') return '';

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    // Mixed: commas are grouping, dot is decimal (our formatter + user typing)
    s = s.replace(/,/g, '');
    return s;
  }

  if (hasDot) {
    // Dot only — always decimal
    return s;
  }

  if (hasComma) {
    const commaCount = s.split(',').length - 1;
    if (commaCount === 1) {
      const afterComma = s.split(',')[1];
      // 1 or 2 digits after comma → locale decimal (e.g. "10,5" or "10,50")
      if (afterComma.length <= 2) return s.replace(',', '.');
    }
    // Multiple commas or 3+ digits after → grouping
    return s.replace(/,/g, '');
  }

  return s;
}

/**
 * Process a raw keystroke value for USD money input:
 * normalize → validate → format for live display.
 *
 * Returns `{ display, canonical }` or `null` to reject the edit.
 */
export function processMoneyInput(raw: string): { display: string; canonical: string } | null {
  const canonical = normalizeForTyping(raw);
  if (canonical === null) return null;
  if (canonical === '') return { display: '', canonical: '' };

  const validated = validateUsdInput(canonical);
  if (validated === null) return null;

  return { display: formatUsdLive(validated), canonical: validated };
}
