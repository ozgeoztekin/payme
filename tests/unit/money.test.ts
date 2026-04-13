import { describe, it, expect } from 'vitest';
import {
  normalizeMoneyInput,
  formatUsdLive,
  formatUsdBlur,
  validateUsdInput,
  parseUsdToMinor,
  parseAmountToMinor,
  processMoneyInput,
} from '@/lib/money';
import {
  parseAmountToMinor as utilsParseAmountToMinor,
  sanitizeAmountInput as utilsSanitizeAmountInput,
} from '@/lib/utils';

// ---------------------------------------------------------------------------
// normalizeMoneyInput
// ---------------------------------------------------------------------------
describe('normalizeMoneyInput', () => {
  it('returns empty string for empty/whitespace input', () => {
    expect(normalizeMoneyInput('')).toBe('');
    expect(normalizeMoneyInput('  ')).toBe('');
  });

  it('passes through plain integers', () => {
    expect(normalizeMoneyInput('120')).toBe('120');
    expect(normalizeMoneyInput('0')).toBe('0');
  });

  it('treats single dot as decimal separator', () => {
    expect(normalizeMoneyInput('120.5')).toBe('120.5');
    expect(normalizeMoneyInput('120.50')).toBe('120.50');
  });

  it('treats single comma as decimal separator', () => {
    expect(normalizeMoneyInput('120,5')).toBe('120.5');
    expect(normalizeMoneyInput('120,50')).toBe('120.50');
  });

  it('strips multiple dots as grouping (e.g. European thousands)', () => {
    expect(normalizeMoneyInput('1.000')).toBe('1000');
    expect(normalizeMoneyInput('1.000.500')).toBe('1000500');
  });

  it('strips multiple commas as grouping (US thousands)', () => {
    expect(normalizeMoneyInput('1,000')).toBe('1000');
    expect(normalizeMoneyInput('1,000,500')).toBe('1000500');
  });

  it('handles US-style mixed separators: commas then dot', () => {
    expect(normalizeMoneyInput('1,000.50')).toBe('1000.50');
    expect(normalizeMoneyInput('10,000.5')).toBe('10000.5');
    expect(normalizeMoneyInput('1,234,567.89')).toBe('1234567.89');
  });

  it('handles European-style mixed separators: dots then comma', () => {
    expect(normalizeMoneyInput('1.000,50')).toBe('1000.50');
    expect(normalizeMoneyInput('10.000,5')).toBe('10000.5');
    expect(normalizeMoneyInput('1.234.567,89')).toBe('1234567.89');
  });

  it('strips currency symbols and spaces', () => {
    expect(normalizeMoneyInput('$1,000.50')).toBe('1000.50');
    expect(normalizeMoneyInput('$ 100')).toBe('100');
  });

  it('returns null for completely non-numeric input', () => {
    expect(normalizeMoneyInput('abc')).toBeNull();
    expect(normalizeMoneyInput('$')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateUsdInput
// ---------------------------------------------------------------------------
describe('validateUsdInput', () => {
  it('allows empty string', () => {
    expect(validateUsdInput('')).toBe('');
  });

  it('allows plain integers', () => {
    expect(validateUsdInput('100')).toBe('100');
    expect(validateUsdInput('0')).toBe('0');
  });

  it('allows up to 2 decimal digits', () => {
    expect(validateUsdInput('10.5')).toBe('10.5');
    expect(validateUsdInput('10.50')).toBe('10.50');
  });

  it('allows trailing dot (user is about to type fraction)', () => {
    expect(validateUsdInput('10.')).toBe('10.');
  });

  it('rejects more than 2 decimal digits', () => {
    expect(validateUsdInput('10.123')).toBeNull();
    expect(validateUsdInput('10.999')).toBeNull();
  });

  it('rejects multiple dots', () => {
    expect(validateUsdInput('10.5.3')).toBeNull();
  });

  it('strips leading zeros', () => {
    expect(validateUsdInput('007')).toBe('7');
    expect(validateUsdInput('00')).toBe('0');
  });

  it('rejects letters', () => {
    expect(validateUsdInput('12a')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatUsdLive
// ---------------------------------------------------------------------------
describe('formatUsdLive', () => {
  it('returns short numbers unchanged', () => {
    expect(formatUsdLive('10')).toBe('10');
    expect(formatUsdLive('100')).toBe('100');
  });

  it('adds thousands separator', () => {
    expect(formatUsdLive('1000')).toBe('1,000');
    expect(formatUsdLive('10000')).toBe('10,000');
    expect(formatUsdLive('1000000')).toBe('1,000,000');
  });

  it('handles decimals with thousands', () => {
    expect(formatUsdLive('1000.5')).toBe('1,000.5');
    expect(formatUsdLive('1000.50')).toBe('1,000.50');
  });

  it('preserves trailing dot during typing', () => {
    expect(formatUsdLive('100.')).toBe('100.');
    expect(formatUsdLive('1000.')).toBe('1,000.');
  });

  it('returns empty for empty string', () => {
    expect(formatUsdLive('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// formatUsdBlur
// ---------------------------------------------------------------------------
describe('formatUsdBlur', () => {
  it('returns empty for empty string', () => {
    expect(formatUsdBlur('')).toBe('');
  });

  it('formats integer without decimal padding', () => {
    expect(formatUsdBlur('1000')).toBe('1,000');
    expect(formatUsdBlur('500')).toBe('500');
  });

  it('pads single fraction digit to 2', () => {
    expect(formatUsdBlur('1000.5')).toBe('1,000.50');
    expect(formatUsdBlur('10.1')).toBe('10.10');
  });

  it('keeps 2 fraction digits as-is', () => {
    expect(formatUsdBlur('1000.50')).toBe('1,000.50');
  });

  it('strips trailing dot', () => {
    expect(formatUsdBlur('100.')).toBe('100');
  });
});

// ---------------------------------------------------------------------------
// parseUsdToMinor — integer cents conversion
// ---------------------------------------------------------------------------
describe('parseUsdToMinor', () => {
  it('converts integer dollar amounts', () => {
    expect(parseUsdToMinor('10')).toBe(1000);
    expect(parseUsdToMinor('1')).toBe(100);
    expect(parseUsdToMinor('0')).toBe(0);
  });

  it('converts decimal with dot', () => {
    expect(parseUsdToMinor('10.50')).toBe(1050);
    expect(parseUsdToMinor('0.01')).toBe(1);
    expect(parseUsdToMinor('99.99')).toBe(9999);
  });

  it('converts decimal with comma', () => {
    expect(parseUsdToMinor('10,50')).toBe(1050);
    expect(parseUsdToMinor('0,01')).toBe(1);
  });

  it('handles formatted values with thousands separators', () => {
    expect(parseUsdToMinor('1,000')).toBe(100000);
    expect(parseUsdToMinor('1,000.50')).toBe(100050);
    expect(parseUsdToMinor('10,000.00')).toBe(1000000);
  });

  it('handles European-formatted values', () => {
    expect(parseUsdToMinor('1.000,50')).toBe(100050);
  });

  it('returns 0 for empty or invalid input', () => {
    expect(parseUsdToMinor('')).toBe(0);
    expect(parseUsdToMinor('abc')).toBe(0);
  });

  it('never produces floating-point rounding errors for common amounts', () => {
    expect(parseUsdToMinor('19.99')).toBe(1999);
    expect(parseUsdToMinor('9.99')).toBe(999);
    expect(parseUsdToMinor('0.10')).toBe(10);
    expect(parseUsdToMinor('0.30')).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// parseAmountToMinor (currency-aware re-export)
// ---------------------------------------------------------------------------
describe('parseAmountToMinor', () => {
  it('defaults to USD (exponent 2)', () => {
    expect(parseAmountToMinor('10.50')).toBe(1050);
  });

  it('handles JPY (exponent 0)', () => {
    expect(parseAmountToMinor('1000', 'JPY')).toBe(1000);
  });

  it('handles KWD (exponent 3)', () => {
    // "1.500" is normalized as grouping (3 digits after dot → 1500 major)
    expect(parseAmountToMinor('1.500', 'KWD')).toBe(1500000);
    // Unambiguous decimal for KWD
    expect(parseAmountToMinor('1.5', 'KWD')).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// processMoneyInput (end-to-end keystroke processing)
// ---------------------------------------------------------------------------
describe('processMoneyInput', () => {
  it('returns display and canonical for valid input', () => {
    const result = processMoneyInput('1000');
    expect(result).toEqual({ display: '1,000', canonical: '1000' });
  });

  it('handles comma as decimal separator', () => {
    const result = processMoneyInput('10,5');
    expect(result).toEqual({ display: '10.5', canonical: '10.5' });
  });

  it('handles US-style thousands + decimal', () => {
    const result = processMoneyInput('1,000.50');
    expect(result).toEqual({ display: '1,000.50', canonical: '1000.50' });
  });

  it('rejects more than 2 decimal digits', () => {
    expect(processMoneyInput('10.123')).toBeNull();
  });

  it('returns empty for cleared input', () => {
    expect(processMoneyInput('')).toEqual({ display: '', canonical: '' });
  });

  it('strips non-numeric input to empty', () => {
    expect(processMoneyInput('abc')).toEqual({ display: '', canonical: '' });
  });

  it('preserves trailing dot', () => {
    const result = processMoneyInput('10.');
    expect(result).toEqual({ display: '10.', canonical: '10.' });
  });

  it('handles values that E2E tests fill (simple decimals)', () => {
    expect(processMoneyInput('50.00')).toEqual({ display: '50.00', canonical: '50.00' });
    expect(processMoneyInput('25.00')).toEqual({ display: '25.00', canonical: '25.00' });
    expect(processMoneyInput('10.00')).toEqual({ display: '10.00', canonical: '10.00' });
    expect(processMoneyInput('0')).toEqual({ display: '0', canonical: '0' });
    expect(processMoneyInput('5.00')).toEqual({ display: '5.00', canonical: '5.00' });
  });

  it('handles large values that E2E tests fill (thousands formatting)', () => {
    expect(processMoneyInput('9999.00')).toEqual({
      display: '9,999.00',
      canonical: '9999.00',
    });
    expect(processMoneyInput('999999.00')).toEqual({
      display: '999,999.00',
      canonical: '999999.00',
    });
  });

  it('handles re-processing of already-formatted display values', () => {
    const first = processMoneyInput('9999.00');
    expect(first).not.toBeNull();
    const second = processMoneyInput(first!.display);
    expect(second).toEqual({ display: '9,999.00', canonical: '9999.00' });
  });

  it('handles comma as locale decimal with 1 or 2 digits after', () => {
    expect(processMoneyInput('10,5')).toEqual({ display: '10.5', canonical: '10.5' });
    expect(processMoneyInput('10,50')).toEqual({ display: '10.50', canonical: '10.50' });
    expect(processMoneyInput('0,01')).toEqual({ display: '0.01', canonical: '0.01' });
  });

  it('treats comma with 3+ digits after as grouping', () => {
    expect(processMoneyInput('1,000')).toEqual({ display: '1,000', canonical: '1000' });
    expect(processMoneyInput('10,000')).toEqual({ display: '10,000', canonical: '10000' });
  });
});

// ---------------------------------------------------------------------------
// utils.ts backward-compatibility wrappers
// ---------------------------------------------------------------------------
describe('utils.ts parseAmountToMinor (backward compat)', () => {
  it('parses simple decimals identically to the money module', () => {
    expect(utilsParseAmountToMinor('50.00')).toBe(5000);
    expect(utilsParseAmountToMinor('10.50')).toBe(1050);
    expect(utilsParseAmountToMinor('0.01')).toBe(1);
    expect(utilsParseAmountToMinor('0')).toBe(0);
  });

  it('parses formatted values with commas', () => {
    expect(utilsParseAmountToMinor('1,000.50')).toBe(100050);
    expect(utilsParseAmountToMinor('10,000')).toBe(1000000);
  });

  it('returns 0 for empty or invalid input', () => {
    expect(utilsParseAmountToMinor('')).toBe(0);
    expect(utilsParseAmountToMinor('abc')).toBe(0);
  });
});

describe('utils.ts sanitizeAmountInput (backward compat)', () => {
  it('passes through valid decimal input', () => {
    expect(utilsSanitizeAmountInput('10.50')).toBe('10.50');
    expect(utilsSanitizeAmountInput('0.01')).toBe('0.01');
  });

  it('normalizes comma-decimal input', () => {
    expect(utilsSanitizeAmountInput('10,50')).toBe('10.50');
  });

  it('treats dot with 3 digits after as grouping (10.123 → 10123)', () => {
    expect(utilsSanitizeAmountInput('10.123')).toBe('10123');
  });

  it('rejects unambiguous 3+ decimal digits (via processMoneyInput in typing context)', () => {
    // In the typing context, dot is always decimal, so processMoneyInput rejects it
    expect(processMoneyInput('10.123')).toBeNull();
  });

  it('allows trailing dot', () => {
    expect(utilsSanitizeAmountInput('10.')).toBe('10.');
  });

  it('strips leading zeros', () => {
    expect(utilsSanitizeAmountInput('007')).toBe('7');
  });

  it('returns null for non-numeric input', () => {
    expect(utilsSanitizeAmountInput('abc')).toBeNull();
  });
});
