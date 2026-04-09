import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: mockRpc,
  },
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('payment-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processPayment', () => {
    it('calls process_payment RPC with wallet funding source and returns transaction id', async () => {
      const txId = 'tx-123';
      mockRpc.mockResolvedValueOnce({ data: txId, error: null });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-123',
        payerId: 'user-1',
        fundingSourceType: 'wallet',
        fundingSourceId: 'wallet-1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactionId).toBe(txId);
      }
      expect(mockRpc).toHaveBeenCalledWith('process_payment', {
        p_request_id: 'req-123',
        p_payer_id: 'user-1',
        p_funding_source_type: 'wallet',
        p_funding_source_id: 'wallet-1',
        p_is_guest: false,
      });
    });

    it('calls process_payment RPC with bank_account funding source', async () => {
      const txId = 'tx-456';
      mockRpc.mockResolvedValueOnce({ data: txId, error: null });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-456',
        payerId: 'user-2',
        fundingSourceType: 'bank_account',
        fundingSourceId: 'bank-1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transactionId).toBe(txId);
      }
      expect(mockRpc).toHaveBeenCalledWith('process_payment', {
        p_request_id: 'req-456',
        p_payer_id: 'user-2',
        p_funding_source_type: 'bank_account',
        p_funding_source_id: 'bank-1',
        p_is_guest: false,
      });
    });

    it('returns INSUFFICIENT_BALANCE error when RPC raises insufficient wallet balance', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'insufficient wallet balance' },
      });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-123',
        payerId: 'user-1',
        fundingSourceType: 'wallet',
        fundingSourceId: 'wallet-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
      }
    });

    it('returns INSUFFICIENT_BALANCE error when RPC raises insufficient bank balance', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'insufficient bank balance' },
      });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-123',
        payerId: 'user-1',
        fundingSourceType: 'bank_account',
        fundingSourceId: 'bank-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
      }
    });

    it('returns REQUEST_NOT_PENDING error when RPC raises not pending', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'payment request is not pending' },
      });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-123',
        payerId: 'user-1',
        fundingSourceType: 'wallet',
        fundingSourceId: 'wallet-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REQUEST_NOT_PENDING');
      }
    });

    it('returns REQUEST_EXPIRED error when RPC raises expired', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'payment request has expired' },
      });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-123',
        payerId: 'user-1',
        fundingSourceType: 'wallet',
        fundingSourceId: 'wallet-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REQUEST_EXPIRED');
      }
    });

    it('returns REQUEST_NOT_FOUND error when RPC raises not found', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'payment request not found' },
      });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-123',
        payerId: 'user-1',
        fundingSourceType: 'wallet',
        fundingSourceId: 'wallet-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REQUEST_NOT_FOUND');
      }
    });

    it('returns PAYMENT_FAILED for unknown RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'something unexpected' },
      });

      const { processPayment } = await import(
        '@/lib/services/payment-service'
      );

      const result = await processPayment({
        requestId: 'req-123',
        payerId: 'user-1',
        fundingSourceType: 'wallet',
        fundingSourceId: 'wallet-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PAYMENT_FAILED');
      }
    });
  });
});
