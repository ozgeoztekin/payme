import { describe, it, expect } from 'vitest';
import { createRequestSchema, validateCreateRequest } from '@/lib/validators/request-validators';

describe('createRequestSchema', () => {
  const validEmailInput = {
    recipientType: 'email' as const,
    recipientValue: 'recipient@example.com',
    amountMinor: 5000,
    currency: 'USD',
    note: 'Dinner split',
  };

  const validPhoneInput = {
    recipientType: 'phone' as const,
    recipientValue: '+15551234567',
    amountMinor: 1000,
    currency: 'USD',
  };

  describe('recipientType', () => {
    it('accepts email', () => {
      const result = createRequestSchema.safeParse(validEmailInput);
      expect(result.success).toBe(true);
    });

    it('accepts phone', () => {
      const result = createRequestSchema.safeParse(validPhoneInput);
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        recipientType: 'fax',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('recipientValue — email', () => {
    it('accepts valid email', () => {
      const result = createRequestSchema.safeParse(validEmailInput);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        recipientValue: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty email', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        recipientValue: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('recipientValue — phone', () => {
    it('accepts valid E.164 phone', () => {
      const result = createRequestSchema.safeParse(validPhoneInput);
      expect(result.success).toBe(true);
    });

    it('rejects phone without +', () => {
      const result = createRequestSchema.safeParse({
        ...validPhoneInput,
        recipientValue: '15551234567',
      });
      expect(result.success).toBe(false);
    });

    it('rejects phone starting with +0', () => {
      const result = createRequestSchema.safeParse({
        ...validPhoneInput,
        recipientValue: '+05551234567',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('amountMinor', () => {
    it('accepts minimum amount (1 minor unit)', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        amountMinor: 1,
      });
      expect(result.success).toBe(true);
    });

    it('accepts maximum amount (1,000,000 minor units)', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        amountMinor: 1_000_000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects zero', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        amountMinor: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        amountMinor: -100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects above max', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        amountMinor: 1_000_001,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        amountMinor: 10.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('note', () => {
    it('accepts valid note', () => {
      const result = createRequestSchema.safeParse(validEmailInput);
      expect(result.success).toBe(true);
    });

    it('accepts undefined note', () => {
      const result = createRequestSchema.safeParse({
        recipientType: validEmailInput.recipientType,
        recipientValue: validEmailInput.recipientValue,
        amountMinor: validEmailInput.amountMinor,
        currency: validEmailInput.currency,
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty string note', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        note: '',
      });
      expect(result.success).toBe(true);
    });

    it('rejects note over 250 characters', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        note: 'a'.repeat(251),
      });
      expect(result.success).toBe(false);
    });

    it('accepts note at 250 characters', () => {
      const result = createRequestSchema.safeParse({
        ...validEmailInput,
        note: 'a'.repeat(250),
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('validateCreateRequest', () => {
  it('returns error when sender sends to own email', () => {
    const result = validateCreateRequest(
      {
        recipientType: 'email',
        recipientValue: 'alice@test.com',
        amountMinor: 1000,
        currency: 'USD',
      },
      { email: 'alice@test.com', phone: null },
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SELF_REQUEST');
    }
  });

  it('returns error when sender sends to own phone', () => {
    const result = validateCreateRequest(
      {
        recipientType: 'phone',
        recipientValue: '+15551111111',
        amountMinor: 1000,
        currency: 'USD',
      },
      { email: null, phone: '+15551111111' },
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SELF_REQUEST');
    }
  });

  it('returns error when email matches sender phone-based contact (cross-check)', () => {
    const result = validateCreateRequest(
      {
        recipientType: 'email',
        recipientValue: 'alice@test.com',
        amountMinor: 1000,
        currency: 'USD',
      },
      { email: 'alice@test.com', phone: '+15551111111' },
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SELF_REQUEST');
    }
  });

  it('returns success when sending to a different person', () => {
    const result = validateCreateRequest(
      {
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 1000,
        currency: 'USD',
      },
      { email: 'alice@test.com', phone: '+15551111111' },
    );
    expect(result.success).toBe(true);
  });

  it('returns validation error on invalid schema input', () => {
    const result = validateCreateRequest(
      {
        recipientType: 'email',
        recipientValue: 'bad-email',
        amountMinor: 0,
        currency: 'USD',
      },
      { email: 'alice@test.com', phone: null },
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
