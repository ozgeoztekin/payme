import { CURRENCY_EXPONENTS, DEFAULT_CURRENCY } from '@/lib/constants';
import {
  parseAmountToMinor as _parseAmountToMinor,
  normalizeMoneyInput,
  validateUsdInput,
} from '@/lib/money';

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  let fmt = formatterCache.get(currency);
  if (!fmt) {
    const exponent = CURRENCY_EXPONENTS[currency] ?? 2;
    fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    });
    formatterCache.set(currency, fmt);
  }
  return fmt;
}

/**
 * Format an integer minor-unit amount using the ISO 4217 exponent for the
 * given currency. Falls back to exponent 2 for unknown currencies.
 */
export function formatMinor(minorUnits: number, currency: string = DEFAULT_CURRENCY): string {
  const exponent = CURRENCY_EXPONENTS[currency] ?? 2;
  return getFormatter(currency).format(minorUnits / 10 ** exponent);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Parse a display-string (e.g. "12.50", "1,000.50", "1.000,50") to integer
 * minor units for the given currency. Delegates to the locale-aware money
 * module. Returns 0 for unparseable input.
 */
export function parseAmountToMinor(value: string, currency: string = DEFAULT_CURRENCY): number {
  return _parseAmountToMinor(value, currency);
}

/**
 * Sanitise a free-text amount input: normalize mixed-locale separators,
 * allow at most one decimal point and 2 fractional digits.
 * Returns the cleaned canonical string, or `null` to reject the edit.
 */
export function sanitizeAmountInput(value: string): string | null {
  const canonical = normalizeMoneyInput(value);
  if (canonical === null) return null;
  return validateUsdInput(canonical);
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'pending',
  paid: 'paid',
  declined: 'declined',
  canceled: 'canceled',
  expired: 'expired',
};

export function getEmptyStateTitle(tab: 'incoming' | 'outgoing', status: string): string {
  const label = status !== 'all' ? STATUS_LABELS[status] : null;
  if (label) return `No ${label} requests`;
  return tab === 'incoming' ? 'No incoming requests' : 'No outgoing requests';
}

export const BANK_OPTIONS = [
  { value: '', label: 'Select a bank' },
  { value: 'Chase', label: 'Chase' },
  { value: 'Bank of America', label: 'Bank of America' },
  { value: 'Wells Fargo', label: 'Wells Fargo' },
  { value: 'Citi', label: 'Citi' },
  { value: 'Capital One', label: 'Capital One' },
  { value: 'US Bank', label: 'US Bank' },
] as const;
