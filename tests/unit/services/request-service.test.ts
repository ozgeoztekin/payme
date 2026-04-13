import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VALID_TRANSITIONS } from '@/lib/types/domain';

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

describe('VALID_TRANSITIONS', () => {
  it('allows pending to transition to paid', () => {
    expect(VALID_TRANSITIONS.pending).toContain('paid');
  });

  it('allows pending to transition to declined', () => {
    expect(VALID_TRANSITIONS.pending).toContain('declined');
  });

  it('allows pending to transition to canceled', () => {
    expect(VALID_TRANSITIONS.pending).toContain('canceled');
  });

  it('allows pending to transition to expired', () => {
    expect(VALID_TRANSITIONS.pending).toContain('expired');
  });

  it('does not allow paid to transition', () => {
    expect(VALID_TRANSITIONS.paid).toHaveLength(0);
  });

  it('does not allow declined to transition', () => {
    expect(VALID_TRANSITIONS.declined).toHaveLength(0);
  });

  it('does not allow canceled to transition', () => {
    expect(VALID_TRANSITIONS.canceled).toHaveLength(0);
  });

  it('does not allow expired to transition', () => {
    expect(VALID_TRANSITIONS.expired).toHaveLength(0);
  });
});

describe('request-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTransition', () => {
    it('accepts valid transition from pending to paid', async () => {
      const { validateTransition } = await import('@/lib/services/request-service');
      expect(validateTransition('pending', 'paid')).toBe(true);
    });

    it('rejects transition from paid to pending', async () => {
      const { validateTransition } = await import('@/lib/services/request-service');
      expect(validateTransition('paid', 'pending')).toBe(false);
    });

    it('rejects transition from declined to paid', async () => {
      const { validateTransition } = await import('@/lib/services/request-service');
      expect(validateTransition('declined', 'paid')).toBe(false);
    });

    it('rejects same-state transition for terminal states', async () => {
      const { validateTransition } = await import('@/lib/services/request-service');
      expect(validateTransition('paid', 'paid')).toBe(false);
      expect(validateTransition('expired', 'expired')).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('returns true when expires_at is in the past', async () => {
      const { isExpired } = await import('@/lib/services/request-service');
      const pastDate = new Date(Date.now() - 60_000).toISOString();
      expect(isExpired(pastDate)).toBe(true);
    });

    it('returns false when expires_at is in the future', async () => {
      const { isExpired } = await import('@/lib/services/request-service');
      const futureDate = new Date(Date.now() + 60_000).toISOString();
      expect(isExpired(futureDate)).toBe(false);
    });
  });

  describe('createRequest', () => {
    it('creates a request and returns success with share URL', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');
      const mockRequest = {
        id: 'req-123',
        requester_id: 'user-1',
        recipient_type: 'email',
        recipient_value: 'bob@test.com',
        amount_minor: 5000,
        currency: 'USD',
        note: 'Dinner',
        status: 'pending',
        share_token: 'token-abc',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
          }),
        }),
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { createRequest } = await import('@/lib/services/request-service');
      const result = await createRequest({
        requesterId: 'user-1',
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 5000,
        currency: 'USD',
        note: 'Dinner',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.request.id).toBe('req-123');
        expect(result.data.shareUrl).toContain('/pay/token-abc');
      }
    });

    it('returns error when database insert fails', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { createRequest } = await import('@/lib/services/request-service');
      const result = await createRequest({
        requesterId: 'user-1',
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 5000,
        currency: 'USD',
      });

      expect(result.success).toBe(false);
    });

    it('returns error when insert returns no data (null) without explicit error', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { createRequest } = await import('@/lib/services/request-service');
      const result = await createRequest({
        requesterId: 'user-1',
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 5000,
        currency: 'USD',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CREATE_FAILED');
      }
    });
  });

  describe('declineRequest', () => {
    it('successfully declines a pending request', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const now = new Date().toISOString();
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_requests_view') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'req-d1',
                    requester_id: 'user-a',
                    status: 'pending',
                    effective_status: 'pending',
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'payment_requests') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'req-d1', status: 'declined', resolved_at: now },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { declineRequest } = await import('@/lib/services/request-service');
      const result = await declineRequest('req-d1', 'user-b');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.request.status).toBe('declined');
      }
    });

    it('returns REQUEST_NOT_FOUND when request does not exist', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_requests_view') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
              }),
            }),
          };
        }
        return {};
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { declineRequest } = await import('@/lib/services/request-service');
      const result = await declineRequest('nonexistent', 'user-b');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REQUEST_NOT_FOUND');
      }
    });

    it('returns UPDATE_FAILED when update returns no data', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_requests_view') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'req-d2',
                    status: 'pending',
                    effective_status: 'pending',
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'payment_requests') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'race' } }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { declineRequest } = await import('@/lib/services/request-service');
      const result = await declineRequest('req-d2', 'user-b');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UPDATE_FAILED');
      }
    });
  });

  describe('cancelRequest', () => {
    it('successfully cancels own pending request', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const now = new Date().toISOString();
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_requests_view') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'req-c1',
                    requester_id: 'user-a',
                    status: 'pending',
                    effective_status: 'pending',
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'payment_requests') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'req-c1', status: 'canceled', resolved_at: now },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { cancelRequest } = await import('@/lib/services/request-service');
      const result = await cancelRequest('req-c1', 'user-a');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.request.status).toBe('canceled');
      }
    });

    it('rejects cancel by non-requester', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_requests_view') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'req-c2',
                    requester_id: 'user-a',
                    status: 'pending',
                    effective_status: 'pending',
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { cancelRequest } = await import('@/lib/services/request-service');
      const result = await cancelRequest('req-c2', 'user-b');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_REQUESTER');
      }
    });

    it('returns REQUEST_NOT_FOUND when request does not exist', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_requests_view') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
              }),
            }),
          };
        }
        return {};
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { cancelRequest } = await import('@/lib/services/request-service');
      const result = await cancelRequest('nonexistent', 'user-a');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REQUEST_NOT_FOUND');
      }
    });

    it('returns UPDATE_FAILED when cancel update returns no data', async () => {
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_requests_view') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'req-c3',
                    requester_id: 'user-a',
                    status: 'pending',
                    effective_status: 'pending',
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'payment_requests') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });
      vi.mocked(supabaseAdmin).from = mockFrom;

      const { cancelRequest } = await import('@/lib/services/request-service');
      const result = await cancelRequest('req-c3', 'user-a');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UPDATE_FAILED');
      }
    });
  });
});
