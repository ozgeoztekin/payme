import { describe, it, expect } from 'vitest';
import { addPhoneSchema } from '@/lib/validators/profile-validators';

describe('addPhoneSchema', () => {
  it('accepts a valid E.164 phone number', () => {
    const result = addPhoneSchema.safeParse({ phone: '+15551234567' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+15551234567');
    }
  });

  it('accepts a short valid E.164 number (2 digits after country code)', () => {
    const result = addPhoneSchema.safeParse({ phone: '+11' });
    expect(result.success).toBe(true);
  });

  it('accepts the maximum length E.164 number (15 digits)', () => {
    const result = addPhoneSchema.safeParse({ phone: '+123456789012345' });
    expect(result.success).toBe(true);
  });

  it('trims leading and trailing whitespace before validation', () => {
    const result = addPhoneSchema.safeParse({ phone: '  +15551234567  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+15551234567');
    }
  });

  it('rejects an empty string', () => {
    const result = addPhoneSchema.safeParse({ phone: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    const result = addPhoneSchema.safeParse({ phone: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone number missing the plus sign', () => {
    const result = addPhoneSchema.safeParse({ phone: '15551234567' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone number starting with +0', () => {
    const result = addPhoneSchema.safeParse({ phone: '+05551234567' });
    expect(result.success).toBe(false);
  });

  it('rejects a number that is too long (more than 15 digits)', () => {
    const result = addPhoneSchema.safeParse({ phone: '+1234567890123456' });
    expect(result.success).toBe(false);
  });

  it('rejects a number that is too short (just the plus)', () => {
    const result = addPhoneSchema.safeParse({ phone: '+' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone number with letters', () => {
    const result = addPhoneSchema.safeParse({ phone: '+1555abc4567' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone number with special characters', () => {
    const result = addPhoneSchema.safeParse({ phone: '+1-555-123-4567' });
    expect(result.success).toBe(false);
  });

  it('rejects when phone field is missing', () => {
    const result = addPhoneSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
