import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    rpc: mockRpc,
  },
}));

describe('db/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processPaymentTransaction', () => {
    it('calls process_payment RPC and returns transaction id', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'tx-pay-1', error: null });

      const { processPaymentTransaction } = await import('@/lib/db/transactions');
      const result = await processPaymentTransaction({
        requestId: 'req-1',
        payerId: 'user-1',
        fundingSourceType: 'wallet',
        fundingSourceId: 'wallet-1',
      });

      expect(result).toBe('tx-pay-1');
      expect(mockRpc).toHaveBeenCalledWith('process_payment', {
        p_request_id: 'req-1',
        p_payer_id: 'user-1',
        p_funding_source_type: 'wallet',
        p_funding_source_id: 'wallet-1',
        p_is_guest: false,
      });
    });

    it('passes isGuest flag when true', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'tx-pay-2', error: null });

      const { processPaymentTransaction } = await import('@/lib/db/transactions');
      await processPaymentTransaction({
        requestId: 'req-2',
        payerId: null,
        fundingSourceType: 'bank_account',
        fundingSourceId: 'bank-1',
        isGuest: true,
      });

      expect(mockRpc).toHaveBeenCalledWith('process_payment', {
        p_request_id: 'req-2',
        p_payer_id: null,
        p_funding_source_type: 'bank_account',
        p_funding_source_id: 'bank-1',
        p_is_guest: true,
      });
    });

    it('throws error on RPC failure', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } });

      const { processPaymentTransaction } = await import('@/lib/db/transactions');
      await expect(
        processPaymentTransaction({
          requestId: 'req-3',
          payerId: 'user-1',
          fundingSourceType: 'wallet',
          fundingSourceId: 'wallet-1',
        }),
      ).rejects.toThrow('RPC failed');
    });
  });

  describe('processTopUpTransaction', () => {
    it('calls process_top_up RPC and returns transaction id', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'tx-topup-1', error: null });

      const { processTopUpTransaction } = await import('@/lib/db/transactions');
      const result = await processTopUpTransaction({
        userId: 'user-1',
        bankAccountId: 'bank-1',
        amountMinor: 5000,
      });

      expect(result).toBe('tx-topup-1');
      expect(mockRpc).toHaveBeenCalledWith('process_top_up', {
        p_user_id: 'user-1',
        p_bank_account_id: 'bank-1',
        p_amount_minor: 5000,
      });
    });

    it('throws error on RPC failure', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Top-up RPC failed' } });

      const { processTopUpTransaction } = await import('@/lib/db/transactions');
      await expect(
        processTopUpTransaction({
          userId: 'user-1',
          bankAccountId: 'bank-1',
          amountMinor: 5000,
        }),
      ).rejects.toThrow('Top-up RPC failed');
    });
  });
});
