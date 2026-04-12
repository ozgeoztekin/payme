export const AMOUNT_MIN_MINOR = 1;
export const AMOUNT_MAX_MINOR = 1_000_000;
export const NOTE_MAX_LENGTH = 250;
export const EXPIRATION_DAYS = 7;
export const PAGINATION_DEFAULT_PAGE = 1;
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 50;
export const MOCKED_BANK_BALANCE_MINOR = 1_000_000;
export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export const SUPPORTED_CURRENCIES = ['USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

// ISO 4217 minor-unit exponents for supported + common currencies
export const CURRENCY_EXPONENTS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  TRY: 2,
  JPY: 0,
  KWD: 3,
};
