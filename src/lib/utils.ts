const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Parse a dollar-string (e.g. "12.50") to integer cents.
 * Returns 0 for unparseable input.
 */
export function parseAmountToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
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

export const BANK_OPTIONS = [
  { value: '', label: 'Select a bank' },
  { value: 'Chase', label: 'Chase' },
  { value: 'Bank of America', label: 'Bank of America' },
  { value: 'Wells Fargo', label: 'Wells Fargo' },
  { value: 'Citi', label: 'Citi' },
  { value: 'Capital One', label: 'Capital One' },
  { value: 'US Bank', label: 'US Bank' },
] as const;
