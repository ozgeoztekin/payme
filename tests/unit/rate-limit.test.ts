import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request from a new IP', () => {
    const result = checkRateLimit('10.0.0.1');
    expect(result.allowed).toBe(true);
  });

  it('allows multiple requests within the limit', () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit('10.0.0.2');
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests after the limit is exhausted', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('10.0.0.3');
    }
    const result = checkRateLimit('10.0.0.3');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000);
    }
  });

  it('refills tokens after time passes', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('10.0.0.4');
    }
    const blocked = checkRateLimit('10.0.0.4');
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(60_000);

    const result = checkRateLimit('10.0.0.4');
    expect(result.allowed).toBe(true);
  });

  it('partially refills tokens after partial time', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('10.0.0.5');
    }

    vi.advanceTimersByTime(6_000);

    const result = checkRateLimit('10.0.0.5');
    expect(result.allowed).toBe(true);
  });

  it('tracks different IPs independently', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('10.0.0.6');
    }
    const blocked = checkRateLimit('10.0.0.6');
    expect(blocked.allowed).toBe(false);

    const result = checkRateLimit('10.0.0.7');
    expect(result.allowed).toBe(true);
  });

  it('returns retryAfterMs of at least 1000 when blocked', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('10.0.0.8');
    }
    const result = checkRateLimit('10.0.0.8');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000);
    }
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
    });
    expect(getClientIp(request)).toBe('203.0.113.50');
  });

  it('returns single IP from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('trims whitespace from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' },
    });
    expect(getClientIp(request)).toBe('10.0.0.1');
  });

  it('falls back to 127.0.0.1 when no x-forwarded-for header', () => {
    const request = new Request('http://localhost');
    expect(getClientIp(request)).toBe('127.0.0.1');
  });
});
