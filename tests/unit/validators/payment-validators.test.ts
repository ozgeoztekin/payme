import { describe, it, expect } from 'vitest';
import { payRequestSchema, validatePayRequest } from '@/lib/validators/payment-validators';

describe('payRequestSchema', () => {
  const validWalletInput = {
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    fundingSource: 'wallet' as const,
  };

  const validBankInput = {
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    fundingSource: 'bank_account' as const,
  };

  describe('requestId', () => {
    it('accepts valid UUID', () => {
      const result = payRequestSchema.safeParse(validWalletInput);
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID string', () => {
      const result = payRequestSchema.safeParse({
        ...validWalletInput,
        requestId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = payRequestSchema.safeParse({
        ...validWalletInput,
        requestId: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing requestId', () => {
      const { requestId: _requestId, ...noId } = validWalletInput;
      const result = payRequestSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });
  });

  describe('fundingSource', () => {
    it('accepts wallet', () => {
      const result = payRequestSchema.safeParse(validWalletInput);
      expect(result.success).toBe(true);
    });

    it('accepts bank_account', () => {
      const result = payRequestSchema.safeParse(validBankInput);
      expect(result.success).toBe(true);
    });

    it('rejects invalid funding source', () => {
      const result = payRequestSchema.safeParse({
        ...validWalletInput,
        fundingSource: 'crypto',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing fundingSource', () => {
      const { fundingSource: _fundingSource, ...noSource } = validWalletInput;
      const result = payRequestSchema.safeParse(noSource);
      expect(result.success).toBe(false);
    });
  });
});

describe('validatePayRequest', () => {
  it('returns success for valid wallet input', () => {
    const result = validatePayRequest({
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      fundingSource: 'wallet',
    });
    expect(result.success).toBe(true);
  });

  it('returns success for valid bank_account input', () => {
    const result = validatePayRequest({
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      fundingSource: 'bank_account',
    });
    expect(result.success).toBe(true);
  });

  it('returns validation error for invalid requestId', () => {
    const result = validatePayRequest({
      requestId: 'bad-id',
      fundingSource: 'wallet',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.field).toBe('requestId');
    }
  });

  it('returns validation error for invalid fundingSource', () => {
    const result = validatePayRequest({
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      fundingSource: 'cash',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
