export const RequestStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  DECLINED: 'declined',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const TransactionType = {
  PAYMENT: 'payment',
  TOP_UP: 'top_up',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const FundingSourceType = {
  WALLET: 'wallet',
  BANK_ACCOUNT: 'bank_account',
} as const;

export type FundingSourceType = (typeof FundingSourceType)[keyof typeof FundingSourceType];

export const ActorType = {
  USER: 'user',
  GUEST: 'guest',
  SYSTEM: 'system',
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const AuditAction = {
  REQUEST_CREATED: 'request.created',
  REQUEST_PAID: 'request.paid',
  REQUEST_DECLINED: 'request.declined',
  REQUEST_CANCELED: 'request.canceled',
  REQUEST_EXPIRED: 'request.expired',
  WALLET_TOP_UP: 'wallet.top_up',
  BANK_CONNECTED: 'bank.connected',
  BANK_REPLACED: 'bank.replaced',
  PAYMENT_FAILED: 'payment.failed',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const RecipientType = {
  EMAIL: 'email',
  PHONE: 'phone',
} as const;

export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType];

export const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ['paid', 'declined', 'canceled', 'expired'],
  paid: [],
  declined: [],
  canceled: [],
  expired: [],
};
