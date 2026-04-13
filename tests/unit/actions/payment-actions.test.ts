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

const mockProcessPayment = vi.fn();
vi.mock('@/lib/services/payment-service', () => ({
  processPayment: (...args: unknown[]) => mockProcessPayment(...args),
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

function makeAdminChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
        }),
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

describe('payment-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('payRequest', () => {
    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('returns validation error for invalid requestId', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({ requestId: 'bad-id', fundingSource: 'wallet' });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns USER_NOT_FOUND when profile missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain(null, { message: 'not found' }));

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns USER_INACTIVE when account is not active', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(
        makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'inactive' }),
      );

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_INACTIVE');
    });

    it('returns REQUEST_NOT_FOUND when request does not exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain(null, { message: 'not found' });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('REQUEST_NOT_FOUND');
    });

    it('returns REQUEST_EXPIRED for expired request', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain({
          id: 'req-1',
          effective_status: 'expired',
          recipient_type: 'email',
          recipient_value: 'a@t.com',
          amount_minor: 1000,
        });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('REQUEST_EXPIRED');
    });

    it('returns REQUEST_NOT_PENDING for non-pending request', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain({
          id: 'req-1',
          effective_status: 'paid',
          recipient_type: 'email',
          recipient_value: 'a@t.com',
          amount_minor: 1000,
        });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('REQUEST_NOT_PENDING');
    });

    it('returns NOT_RECIPIENT when user is not the recipient', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        return makeAdminChain({
          id: 'req-1',
          effective_status: 'pending',
          recipient_type: 'email',
          recipient_value: 'other@t.com',
          amount_minor: 1000,
        });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('NOT_RECIPIENT');
    });

    it('returns PAYMENT_FAILED when wallet not found', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({
            id: 'req-1',
            effective_status: 'pending',
            recipient_type: 'email',
            recipient_value: 'a@t.com',
            amount_minor: 1000,
          });
        }
        return makeAdminChain(null, { message: 'wallet not found' });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('PAYMENT_FAILED');
    });

    it('returns INSUFFICIENT_BALANCE when wallet has insufficient funds', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({
            id: 'req-1',
            effective_status: 'pending',
            recipient_type: 'email',
            recipient_value: 'a@t.com',
            amount_minor: 5000,
          });
        }
        return makeAdminChain({ id: 'w-1', balance_minor: 100 });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('processes payment with wallet successfully', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({
            id: 'req-1',
            effective_status: 'pending',
            recipient_type: 'email',
            recipient_value: 'a@t.com',
            amount_minor: 1000,
          });
        }
        return makeAdminChain({ id: 'w-1', balance_minor: 5000 });
      });
      mockProcessPayment.mockResolvedValueOnce({
        success: true,
        data: { transactionId: 'tx-1' },
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactionId).toBe('tx-1');
      }
    });

    it('returns NO_BANK_ACCOUNT when bank not found for bank_account source', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({
            id: 'req-1',
            effective_status: 'pending',
            recipient_type: 'email',
            recipient_value: 'a@t.com',
            amount_minor: 1000,
          });
        }
        return makeAdminChain(null, { message: 'not found' });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'bank_account',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('NO_BANK_ACCOUNT');
    });

    it('returns INSUFFICIENT_BALANCE when bank has insufficient funds', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({
            id: 'req-1',
            effective_status: 'pending',
            recipient_type: 'email',
            recipient_value: 'a@t.com',
            amount_minor: 5000,
          });
        }
        return makeAdminChain({ id: 'b-1', balance_minor: 100 });
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'bank_account',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('logs audit and returns error when processPayment fails', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', email: 'a@t.com', phone: null, status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({
            id: 'req-1',
            effective_status: 'pending',
            recipient_type: 'email',
            recipient_value: 'a@t.com',
            amount_minor: 1000,
          });
        }
        return makeAdminChain({ id: 'w-1', balance_minor: 5000 });
      });
      mockProcessPayment.mockResolvedValueOnce({
        success: false,
        error: { code: 'PAYMENT_FAILED', message: 'Something went wrong' },
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('PAYMENT_FAILED');
    });

    it('matches recipient by phone', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({
            id: 'u-1',
            email: null,
            phone: '+15551234567',
            status: 'active',
          });
        }
        if (callCount === 2) {
          return makeAdminChain({
            id: 'req-1',
            effective_status: 'pending',
            recipient_type: 'phone',
            recipient_value: '+15551234567',
            amount_minor: 1000,
          });
        }
        return makeAdminChain({ id: 'w-1', balance_minor: 5000 });
      });
      mockProcessPayment.mockResolvedValueOnce({
        success: true,
        data: { transactionId: 'tx-2' },
      });

      const { payRequest } = await import('@/lib/actions/payment-actions');
      const result = await payRequest({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        fundingSource: 'wallet',
      });

      expect(result.success).toBe(true);
    });
  });
});
