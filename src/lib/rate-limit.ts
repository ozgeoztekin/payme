import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from '@/lib/constants';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

function refillBucket(bucket: TokenBucket, now: number): void {
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = (elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_MAX_REQUESTS;
  bucket.tokens = Math.min(RATE_LIMIT_MAX_REQUESTS, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

/**
 * IP-based token bucket rate limiter.
 * Returns { allowed: true } if the request should proceed,
 * or { allowed: false, retryAfterMs } if the caller is rate-limited.
 */
export function checkRateLimit(
  ip: string,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_MAX_REQUESTS, lastRefill: now };
    buckets.set(ip, bucket);
  } else {
    refillBucket(bucket, now);
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  const msPerToken = RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS;
  const retryAfterMs = Math.ceil(msPerToken - (now - bucket.lastRefill));
  return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return '127.0.0.1';
}
