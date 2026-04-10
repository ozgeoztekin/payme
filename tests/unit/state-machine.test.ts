import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VALID_TRANSITIONS, RequestStatus } from '@/lib/types/domain';

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const ALL_STATUSES: RequestStatus[] = ['pending', 'paid', 'declined', 'canceled', 'expired'];
const TERMINAL_STATUSES: RequestStatus[] = ['paid', 'declined', 'canceled', 'expired'];

describe('State Machine: VALID_TRANSITIONS', () => {
  describe('pending status (the only non-terminal status)', () => {
    it('defines exactly four valid transitions from pending', () => {
      expect(VALID_TRANSITIONS.pending).toHaveLength(4);
    });

    it.each([
      ['paid'],
      ['declined'],
      ['canceled'],
      ['expired'],
    ] as const)('allows pending → %s', (target) => {
      expect(VALID_TRANSITIONS.pending).toContain(target);
    });

    it('does not allow pending → pending (self-transition)', () => {
      expect(VALID_TRANSITIONS.pending).not.toContain('pending');
    });
  });

  describe('terminal statuses have no outgoing transitions', () => {
    it.each(TERMINAL_STATUSES)('%s has zero valid transitions', (status) => {
      expect(VALID_TRANSITIONS[status]).toHaveLength(0);
    });
  });

  describe('exhaustive invalid transition matrix', () => {
    const invalidTransitions: [RequestStatus, RequestStatus][] = [
      ['paid', 'pending'],
      ['paid', 'paid'],
      ['paid', 'declined'],
      ['paid', 'canceled'],
      ['paid', 'expired'],
      ['declined', 'pending'],
      ['declined', 'paid'],
      ['declined', 'declined'],
      ['declined', 'canceled'],
      ['declined', 'expired'],
      ['canceled', 'pending'],
      ['canceled', 'paid'],
      ['canceled', 'declined'],
      ['canceled', 'canceled'],
      ['canceled', 'expired'],
      ['expired', 'pending'],
      ['expired', 'paid'],
      ['expired', 'declined'],
      ['expired', 'canceled'],
      ['expired', 'expired'],
    ];

    it.each(invalidTransitions)('%s → %s is not allowed', (from, to) => {
      expect(VALID_TRANSITIONS[from]).not.toContain(to);
    });
  });

  describe('completeness', () => {
    it('defines transitions for every status', () => {
      for (const status of ALL_STATUSES) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      }
    });

    it('all transition targets are valid statuses', () => {
      for (const status of ALL_STATUSES) {
        for (const target of VALID_TRANSITIONS[status]) {
          expect(ALL_STATUSES).toContain(target);
        }
      }
    });
  });
});

describe('State Machine: validateTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valid transitions', () => {
    it.each([
      ['pending', 'paid'],
      ['pending', 'declined'],
      ['pending', 'canceled'],
      ['pending', 'expired'],
    ] as [RequestStatus, RequestStatus][])('accepts %s → %s', async (from, to) => {
      const { validateTransition } = await import('@/lib/services/request-service');
      expect(validateTransition(from, to)).toBe(true);
    });
  });

  describe('invalid transitions from terminal statuses', () => {
    it.each(TERMINAL_STATUSES)('rejects any transition from %s', async (from) => {
      const { validateTransition } = await import('@/lib/services/request-service');
      for (const to of ALL_STATUSES) {
        expect(validateTransition(from, to)).toBe(false);
      }
    });
  });

  it('rejects self-transition for pending', async () => {
    const { validateTransition } = await import('@/lib/services/request-service');
    expect(validateTransition('pending', 'pending')).toBe(false);
  });
});

describe('State Machine: isExpired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when expires_at is in the past', async () => {
    const { isExpired } = await import('@/lib/services/request-service');
    const pastDate = new Date(Date.now() - 3_600_000).toISOString();
    expect(isExpired(pastDate)).toBe(true);
  });

  it('returns false when expires_at is in the future', async () => {
    const { isExpired } = await import('@/lib/services/request-service');
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    expect(isExpired(futureDate)).toBe(false);
  });

  it('returns true when expires_at equals exactly now (boundary)', async () => {
    const { isExpired } = await import('@/lib/services/request-service');
    const now = new Date().toISOString();
    expect(isExpired(now)).toBe(true);
  });

  it('returns true for a date far in the past', async () => {
    const { isExpired } = await import('@/lib/services/request-service');
    expect(isExpired('2020-01-01T00:00:00.000Z')).toBe(true);
  });

  it('returns false for a date far in the future', async () => {
    const { isExpired } = await import('@/lib/services/request-service');
    expect(isExpired('2099-12-31T23:59:59.999Z')).toBe(false);
  });

  it('returns true for 1 millisecond past expiry', async () => {
    const { isExpired } = await import('@/lib/services/request-service');
    const justPast = new Date(Date.now() - 1).toISOString();
    expect(isExpired(justPast)).toBe(true);
  });

  it('returns false for 1 second in the future', async () => {
    const { isExpired } = await import('@/lib/services/request-service');
    const justFuture = new Date(Date.now() + 1000).toISOString();
    expect(isExpired(justFuture)).toBe(false);
  });
});

describe('Expiration enforcement in action paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('declineRequest rejects expired requests via effective_status', async () => {
    const { supabaseAdmin } = await import('@/lib/db/client');

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'payment_requests_view') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'req-1',
                  requester_id: 'user-a',
                  status: 'pending',
                  effective_status: 'expired',
                  expires_at: new Date(Date.now() - 86_400_000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
    vi.mocked(supabaseAdmin).from = mockFrom;

    const { declineRequest } = await import('@/lib/services/request-service');
    const result = await declineRequest('req-1', 'user-b');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('REQUEST_EXPIRED');
    }
  });

  it('cancelRequest rejects expired requests via effective_status', async () => {
    const { supabaseAdmin } = await import('@/lib/db/client');

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'payment_requests_view') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'req-2',
                  requester_id: 'user-a',
                  status: 'pending',
                  effective_status: 'expired',
                  expires_at: new Date(Date.now() - 86_400_000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
    vi.mocked(supabaseAdmin).from = mockFrom;

    const { cancelRequest } = await import('@/lib/services/request-service');
    const result = await cancelRequest('req-2', 'user-a');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('REQUEST_EXPIRED');
    }
  });

  it('declineRequest rejects already-paid requests', async () => {
    const { supabaseAdmin } = await import('@/lib/db/client');

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'payment_requests_view') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'req-3',
                  requester_id: 'user-a',
                  status: 'paid',
                  effective_status: 'paid',
                  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
    vi.mocked(supabaseAdmin).from = mockFrom;

    const { declineRequest } = await import('@/lib/services/request-service');
    const result = await declineRequest('req-3', 'user-b');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('REQUEST_NOT_PENDING');
    }
  });

  it('cancelRequest rejects already-declined requests', async () => {
    const { supabaseAdmin } = await import('@/lib/db/client');

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'payment_requests_view') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'req-4',
                  requester_id: 'user-a',
                  status: 'declined',
                  effective_status: 'declined',
                  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
    vi.mocked(supabaseAdmin).from = mockFrom;

    const { cancelRequest } = await import('@/lib/services/request-service');
    const result = await cancelRequest('req-4', 'user-a');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('REQUEST_NOT_PENDING');
    }
  });
});
