import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  phoneSchema,
  amountMinorSchema,
  currencySchema,
  noteSchema,
  uuidSchema,
} from '@/lib/validators/common-validators';

describe('emailSchema', () => {
  it('accepts valid email', () => {
    expect(emailSchema.safeParse('test@example.com').success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts valid E.164 phone number', () => {
    expect(phoneSchema.safeParse('+15551234567').success).toBe(true);
  });

  it('rejects phone without plus', () => {
    expect(phoneSchema.safeParse('15551234567').success).toBe(false);
  });

  it('rejects phone starting with +0', () => {
    expect(phoneSchema.safeParse('+05551234567').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(phoneSchema.safeParse('').success).toBe(false);
  });

  it('rejects too long numbers', () => {
    expect(phoneSchema.safeParse('+1234567890123456').success).toBe(false);
  });
});

describe('amountMinorSchema', () => {
  it('accepts minimum amount (1)', () => {
    expect(amountMinorSchema.safeParse(1).success).toBe(true);
  });

  it('accepts maximum amount (1_000_000)', () => {
    expect(amountMinorSchema.safeParse(1_000_000).success).toBe(true);
  });

  it('rejects zero', () => {
    expect(amountMinorSchema.safeParse(0).success).toBe(false);
  });

  it('rejects negative', () => {
    expect(amountMinorSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects above max', () => {
    expect(amountMinorSchema.safeParse(1_000_001).success).toBe(false);
  });

  it('rejects non-integer', () => {
    expect(amountMinorSchema.safeParse(10.5).success).toBe(false);
  });
});

describe('currencySchema', () => {
  it('accepts USD', () => {
    expect(currencySchema.safeParse('USD').success).toBe(true);
  });

  it('rejects unsupported currency', () => {
    expect(currencySchema.safeParse('EUR').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(currencySchema.safeParse('').success).toBe(false);
  });
});

describe('noteSchema', () => {
  it('accepts valid note', () => {
    expect(noteSchema.safeParse('Dinner split').success).toBe(true);
  });

  it('accepts undefined', () => {
    expect(noteSchema.safeParse(undefined).success).toBe(true);
  });

  it('rejects note over 250 characters', () => {
    expect(noteSchema.safeParse('a'.repeat(251)).success).toBe(false);
  });

  it('accepts note at 250 characters', () => {
    expect(noteSchema.safeParse('a'.repeat(250)).success).toBe(true);
  });
});

describe('uuidSchema', () => {
  it('accepts valid UUID', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('rejects non-UUID string', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(uuidSchema.safeParse('').success).toBe(false);
  });
});
