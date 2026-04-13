import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAdminFrom = vi.fn();

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockAdminFrom(...args),
  },
}));

const mockCreateRequestService = vi.fn();
const mockDeclineRequestService = vi.fn();
const mockCancelRequestService = vi.fn();

vi.mock('@/lib/services/request-service', () => ({
  createRequest: (...args: unknown[]) => mockCreateRequestService(...args),
  declineRequest: (...args: unknown[]) => mockDeclineRequestService(...args),
  cancelRequest: (...args: unknown[]) => mockCancelRequestService(...args),
}));

vi.mock('@/lib/validators/request-validators', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/validators/request-validators')>();
  return { ...mod };
});

function makeAdminChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

describe('request-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequest', () => {
    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { createRequest } = await import('@/lib/actions/request-actions');
      const result = await createRequest({
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 1000,
        currency: 'USD',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('returns USER_NOT_FOUND when profile missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain(null, { message: 'not found' }));

      const { createRequest } = await import('@/lib/actions/request-actions');
      const result = await createRequest({
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 1000,
        currency: 'USD',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns USER_INACTIVE when account is not active', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(
        makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'inactive' }),
      );

      const { createRequest } = await import('@/lib/actions/request-actions');
      const result = await createRequest({
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 1000,
        currency: 'USD',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_INACTIVE');
    });

    it('returns SELF_REQUEST when sending to own email', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(
        makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' }),
      );

      const { createRequest } = await import('@/lib/actions/request-actions');
      const result = await createRequest({
        recipientType: 'email',
        recipientValue: 'a@t.com',
        amountMinor: 1000,
        currency: 'USD',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('SELF_REQUEST');
    });

    it('delegates to service on valid input', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(
        makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' }),
      );
      mockCreateRequestService.mockResolvedValueOnce({
        success: true,
        data: { request: { id: 'req-1' }, shareUrl: 'http://localhost/pay/token' },
      });

      const { createRequest } = await import('@/lib/actions/request-actions');
      const result = await createRequest({
        recipientType: 'email',
        recipientValue: 'bob@test.com',
        amountMinor: 1000,
        currency: 'USD',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('declineRequest', () => {
    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('returns USER_NOT_FOUND when profile missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain(null));

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns USER_INACTIVE when account is not active', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(
        makeAdminChain({ email: 'a@t.com', phone: null, status: 'inactive' }),
      );

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_INACTIVE');
    });

    it('returns REQUEST_NOT_FOUND when request does not exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain(null);
      });

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('REQUEST_NOT_FOUND');
    });

    it('returns FORBIDDEN when user is not the recipient', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain({
          recipient_type: 'email',
          recipient_value: 'other@t.com',
        });
      });

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('FORBIDDEN');
    });

    it('delegates to service when user is recipient by email', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain({
          recipient_type: 'email',
          recipient_value: 'a@t.com',
        });
      });
      mockDeclineRequestService.mockResolvedValueOnce({
        success: true,
        data: { request: { id: 'req-1', status: 'declined' } },
      });

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.requestId).toBe('req-1');
    });

    it('matches recipient by phone', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ email: null, phone: '+15551234567', status: 'active' });
        }
        return makeAdminChain({
          recipient_type: 'phone',
          recipient_value: '+15551234567',
        });
      });
      mockDeclineRequestService.mockResolvedValueOnce({
        success: true,
        data: { request: { id: 'req-1', status: 'declined' } },
      });

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(true);
    });

    it('returns service error on decline failure', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain({
          recipient_type: 'email',
          recipient_value: 'a@t.com',
        });
      });
      mockDeclineRequestService.mockResolvedValueOnce({
        success: false,
        error: { code: 'REQUEST_EXPIRED', message: 'Expired' },
      });

      const { declineRequest } = await import('@/lib/actions/request-actions');
      const result = await declineRequest('req-1');

      expect(result.success).toBe(false);
    });
  });

  describe('cancelRequest', () => {
    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { cancelRequest } = await import('@/lib/actions/request-actions');
      const result = await cancelRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('returns USER_NOT_FOUND when profile missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain(null));

      const { cancelRequest } = await import('@/lib/actions/request-actions');
      const result = await cancelRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns USER_INACTIVE when account is not active', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain({ status: 'inactive' }));

      const { cancelRequest } = await import('@/lib/actions/request-actions');
      const result = await cancelRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_INACTIVE');
    });

    it('delegates to service on valid request', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain({ status: 'active' }));
      mockCancelRequestService.mockResolvedValueOnce({
        success: true,
        data: { request: { id: 'req-1', status: 'canceled' } },
      });

      const { cancelRequest } = await import('@/lib/actions/request-actions');
      const result = await cancelRequest('req-1');

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.requestId).toBe('req-1');
    });

    it('returns service error on cancel failure', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain({ status: 'active' }));
      mockCancelRequestService.mockResolvedValueOnce({
        success: false,
        error: { code: 'NOT_REQUESTER', message: 'Not requester' },
      });

      const { cancelRequest } = await import('@/lib/actions/request-actions');
      const result = await cancelRequest('req-1');

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('NOT_REQUESTER');
    });
  });
});
