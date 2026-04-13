import { describe, it, expect } from 'vitest';
import { formatMinor, cn, sanitizeAmountInput } from '@/lib/utils';

describe('formatMinor', () => {
  it('formats cents to USD string', () => {
    expect(formatMinor(1050)).toBe('$10.50');
    expect(formatMinor(100)).toBe('$1.00');
    expect(formatMinor(0)).toBe('$0.00');
    expect(formatMinor(999)).toBe('$9.99');
  });

  it('formats large amounts with thousands separator', () => {
    expect(formatMinor(100050)).toBe('$1,000.50');
    expect(formatMinor(1000000)).toBe('$10,000.00');
  });

  it('defaults to USD when no currency specified', () => {
    expect(formatMinor(500)).toBe('$5.00');
  });

  it('formats JPY with no decimal places', () => {
    expect(formatMinor(1000, 'JPY')).toBe('¥1,000');
  });

  it('formats KWD with 3 decimal places', () => {
    expect(formatMinor(1500, 'KWD')).toBe('KWD\u00a01.500');
  });

  it('falls back to exponent 2 for unknown currency', () => {
    const result = formatMinor(1050, 'XYZ');
    expect(result).toContain('10.50');
  });
});

describe('cn', () => {
  it('joins multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar');
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(false, undefined, null)).toBe('');
  });

  it('handles single class', () => {
    expect(cn('single')).toBe('single');
  });

  it('handles empty string values', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });
});

describe('sanitizeAmountInput', () => {
  it('passes through valid decimal input', () => {
    expect(sanitizeAmountInput('10.50')).toBe('10.50');
  });

  it('normalizes comma-decimal input', () => {
    expect(sanitizeAmountInput('10,50')).toBe('10.50');
  });

  it('returns null for non-numeric input', () => {
    expect(sanitizeAmountInput('abc')).toBeNull();
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeAmountInput('')).toBe('');
  });
});
