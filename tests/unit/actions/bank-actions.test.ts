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

vi.mock('@/lib/services/bank-service', () => ({
  connectBankAccount: vi.fn().mockResolvedValue({
    success: true,
    data: { bankAccount: { id: 'bank-1', bank_name: 'Chase' } },
  }),
}));

describe('bank-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectBankAccount', () => {
    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { connectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await connectBankAccount({ bankName: 'Chase', accountNumberLast4: '1234' });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('returns USER_NOT_FOUND when profile missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const { connectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await connectBankAccount({ bankName: 'Chase', accountNumberLast4: '1234' });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns USER_INACTIVE when account is not active', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'u-1', status: 'inactive' } }),
          }),
        }),
      });

      const { connectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await connectBankAccount({ bankName: 'Chase', accountNumberLast4: '1234' });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_INACTIVE');
    });

    it('returns VALIDATION_ERROR for invalid input', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'u-1', status: 'active' } }),
          }),
        }),
      });

      const { connectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await connectBankAccount({ bankName: '', accountNumberLast4: 'abc' });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('delegates to bank service on valid input', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'u-1', status: 'active' } }),
          }),
        }),
      });

      const { connectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await connectBankAccount({ bankName: 'Chase', accountNumberLast4: '1234' });

      expect(result.success).toBe(true);
    });
  });

  describe('disconnectBankAccount', () => {
    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { disconnectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await disconnectBankAccount();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('returns USER_NOT_FOUND when profile missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const { disconnectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await disconnectBankAccount();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns USER_INACTIVE when account is not active', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'u-1', status: 'inactive' } }),
          }),
        }),
      });

      const { disconnectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await disconnectBankAccount();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('USER_INACTIVE');
    });

    it('returns success when bank account deleted', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'u-1', status: 'active' } }),
              }),
            }),
          };
        }
        if (table === 'bank_accounts') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const { disconnectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await disconnectBankAccount();

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.disconnected).toBe(true);
    });

    it('returns INTERNAL_ERROR when delete fails', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'u-1', status: 'active' } }),
              }),
            }),
          };
        }
        if (table === 'bank_accounts') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: { message: 'delete failed' } }),
              }),
            }),
          };
        }
        return {};
      });

      const { disconnectBankAccount } = await import('@/lib/actions/bank-actions');
      const result = await disconnectBankAccount();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
