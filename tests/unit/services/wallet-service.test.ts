import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('wallet-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('topUpFromBank', () => {
    it('calls process_top_up RPC and returns transaction id on success', async () => {
      const txId = 'tx-topup-123';
      mockRpc.mockResolvedValueOnce({ data: txId, error: null });

      const { topUpFromBank } = await import('@/lib/services/wallet-service');

      const result = await topUpFromBank({
        userId: 'user-1',
        bankAccountId: 'bank-1',
        amountMinor: 5000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactionId).toBe(txId);
      }
      expect(mockRpc).toHaveBeenCalledWith('process_top_up', {
        p_user_id: 'user-1',
        p_bank_account_id: 'bank-1',
        p_amount_minor: 5000,
      });
    });

    it('returns INSUFFICIENT_BALANCE error when bank has insufficient funds', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'insufficient bank balance' },
      });

      const { topUpFromBank } = await import('@/lib/services/wallet-service');

      const result = await topUpFromBank({
        userId: 'user-1',
        bankAccountId: 'bank-1',
        amountMinor: 999999999,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
        expect(result.error.message).toContain('bank');
      }
    });

    it('returns NO_BANK_ACCOUNT error when bank account is not found', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'bank account not found' },
      });

      const { topUpFromBank } = await import('@/lib/services/wallet-service');

      const result = await topUpFromBank({
        userId: 'user-1',
        bankAccountId: 'nonexistent-bank',
        amountMinor: 1000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NO_BANK_ACCOUNT');
      }
    });

    it('returns WALLET_NOT_FOUND error when wallet does not exist', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'wallet not found' },
      });

      const { topUpFromBank } = await import('@/lib/services/wallet-service');

      const result = await topUpFromBank({
        userId: 'user-1',
        bankAccountId: 'bank-1',
        amountMinor: 1000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOP_UP_FAILED');
      }
    });

    it('returns VALIDATION_ERROR for invalid amount (zero)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'invalid amount_minor' },
      });

      const { topUpFromBank } = await import('@/lib/services/wallet-service');

      const result = await topUpFromBank({
        userId: 'user-1',
        bankAccountId: 'bank-1',
        amountMinor: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns TOP_UP_FAILED for unknown RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'something unexpected happened' },
      });

      const { topUpFromBank } = await import('@/lib/services/wallet-service');

      const result = await topUpFromBank({
        userId: 'user-1',
        bankAccountId: 'bank-1',
        amountMinor: 1000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOP_UP_FAILED');
      }
    });
  });

  describe('getWalletBalance', () => {
    it('returns wallet data for a valid user', async () => {
      const walletData = {
        id: 'wallet-1',
        user_id: 'user-1',
        balance_minor: 5000,
        currency: 'USD',
        created_at: '2026-04-08T00:00:00Z',
        updated_at: '2026-04-08T00:00:00Z',
      };
      mockSingle.mockResolvedValueOnce({ data: walletData, error: null });

      const { getWalletBalance } = await import('@/lib/services/wallet-service');
      const result = await getWalletBalance('user-1');

      expect(result).not.toBeNull();
      expect(result?.balance_minor).toBe(5000);
      expect(mockFrom).toHaveBeenCalledWith('wallets');
    });

    it('returns null when wallet is not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      const { getWalletBalance } = await import('@/lib/services/wallet-service');
      const result = await getWalletBalance('nonexistent-user');

      expect(result).toBeNull();
    });
  });
});
