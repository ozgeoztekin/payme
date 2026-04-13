import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('bank-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBankAccount', () => {
    it('returns bank account for a valid user', async () => {
      const bankData = {
        id: 'bank-1',
        user_id: 'user-1',
        bank_name: 'Chase',
        account_number_masked: '••••1234',
        balance_minor: 1000000,
        is_guest: false,
      };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: bankData }),
                }),
              }),
            }),
          }),
        }),
      });

      const { getBankAccount } = await import('@/lib/services/bank-service');
      const result = await getBankAccount('user-1');

      expect(result).toEqual(bankData);
      expect(mockFrom).toHaveBeenCalledWith('bank_accounts');
    });

    it('returns null when no bank account exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const { getBankAccount } = await import('@/lib/services/bank-service');
      const result = await getBankAccount('user-no-bank');

      expect(result).toBeNull();
    });
  });

  describe('connectBankAccount', () => {
    it('connects a new bank account when none exists', async () => {
      const newBank = {
        id: 'bank-new',
        user_id: 'user-1',
        bank_name: 'Chase',
        account_number_masked: '••••5678',
        balance_minor: 1000000,
        is_guest: false,
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'bank_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newBank, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const { connectBankAccount } = await import('@/lib/services/bank-service');
      const result = await connectBankAccount({
        userId: 'user-1',
        bankName: 'Chase',
        accountNumberLast4: '5678',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bankAccount.id).toBe('bank-new');
      }
    });

    it('replaces existing bank account', async () => {
      const existing = {
        id: 'bank-old',
        bank_name: 'BOA',
      };
      const newBank = {
        id: 'bank-new',
        user_id: 'user-1',
        bank_name: 'Chase',
        account_number_masked: '••••1234',
        balance_minor: 1000000,
        is_guest: false,
      };

      let selectCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'bank_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockImplementation(() => {
                        selectCallCount++;
                        return selectCallCount === 1
                          ? Promise.resolve({ data: existing })
                          : Promise.resolve({ data: null });
                      }),
                    }),
                  }),
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newBank, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const { connectBankAccount } = await import('@/lib/services/bank-service');
      const result = await connectBankAccount({
        userId: 'user-1',
        bankName: 'Chase',
        accountNumberLast4: '1234',
      });

      expect(result.success).toBe(true);
    });

    it('returns error when delete of existing account fails', async () => {
      const existing = { id: 'bank-old', bank_name: 'BOA' };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'bank_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: existing }),
                    }),
                  }),
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: 'delete failed' } }),
            }),
          };
        }
        return {};
      });

      const { connectBankAccount } = await import('@/lib/services/bank-service');
      const result = await connectBankAccount({
        userId: 'user-1',
        bankName: 'Chase',
        accountNumberLast4: '9999',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_ERROR');
      }
    });

    it('returns error when insert fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'bank_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'insert failed' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const { connectBankAccount } = await import('@/lib/services/bank-service');
      const result = await connectBankAccount({
        userId: 'user-1',
        bankName: 'Chase',
        accountNumberLast4: '0000',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_ERROR');
      }
    });
  });
});
