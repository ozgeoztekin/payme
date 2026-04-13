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

const mockTopUpFromBank = vi.fn();
vi.mock('@/lib/services/wallet-service', () => ({
  topUpFromBank: (...args: unknown[]) => mockTopUpFromBank(...args),
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

describe('wallet-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('topUpWallet', () => {
    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('returns VALIDATION_ERROR for invalid amount', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 0 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns VALIDATION_ERROR for non-integer amount', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 10.5 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns USER_NOT_FOUND when profile missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain(null));

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns USER_INACTIVE when account is not active', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue(makeAdminChain({ id: 'u-1', status: 'inactive' }));

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_INACTIVE');
    });

    it('returns NO_BANK_ACCOUNT when bank not found', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', status: 'active' });
        }
        return makeAdminChain(null);
      });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('NO_BANK_ACCOUNT');
    });

    it('returns INSUFFICIENT_BALANCE when bank has insufficient funds', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', status: 'active' });
        }
        return makeAdminChain({ id: 'b-1', balance_minor: 100 });
      });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('returns success with updated balances on successful top-up', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({ id: 'b-1', balance_minor: 100000 });
        }
        if (callCount === 3) {
          return makeAdminChain({ balance_minor: 55000 });
        }
        return makeAdminChain({ balance_minor: 95000 });
      });
      mockTopUpFromBank.mockResolvedValueOnce({
        success: true,
        data: { transactionId: 'tx-1' },
      });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactionId).toBe('tx-1');
      }
    });

    it('logs audit and returns error when topUpFromBank fails', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', status: 'active' });
        }
        return makeAdminChain({ id: 'b-1', balance_minor: 100000 });
      });
      mockTopUpFromBank.mockResolvedValueOnce({
        success: false,
        error: { code: 'TOP_UP_FAILED', message: 'RPC failed' },
      });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('TOP_UP_FAILED');
    });

    it('returns 0 balances when wallet/bank queries return null after success', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      let callCount = 0;
      mockAdminFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeAdminChain({ id: 'u-1', status: 'active' });
        }
        if (callCount === 2) {
          return makeAdminChain({ id: 'b-1', balance_minor: 100000 });
        }
        return makeAdminChain(null);
      });
      mockTopUpFromBank.mockResolvedValueOnce({
        success: true,
        data: { transactionId: 'tx-2' },
      });

      const { topUpWallet } = await import('@/lib/actions/wallet-actions');
      const result = await topUpWallet({ amountMinor: 5000 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.walletBalance).toBe(0);
        expect(result.data.bankBalance).toBe(0);
      }
    });
  });
});
