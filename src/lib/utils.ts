import { CURRENCY_EXPONENTS, DEFAULT_CURRENCY } from '@/lib/constants';

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
 * Parse a display-string (e.g. "12.50") to integer minor units for the
 * given currency. Returns 0 for unparseable input.
 */
export function parseAmountToMinor(value: string, currency: string = DEFAULT_CURRENCY): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const major = parseFloat(cleaned);
  if (isNaN(major)) return 0;
  const exponent = CURRENCY_EXPONENTS[currency] ?? 2;
  return Math.round(major * 10 ** exponent);
}

/**
 * Sanitise a free-text amount input: strip non-numeric chars except
 * a single decimal point, and limit to 2 decimal places.
 * Returns the cleaned string (or the previous value if the edit is invalid).
 */
export function sanitizeAmountInput(value: string): string | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return null;
  if (parts[1] && parts[1].length > 2) return null;
  return cleaned;
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
