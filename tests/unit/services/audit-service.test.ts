import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn();
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

describe('audit-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  describe('createAuditLog', () => {
    it('inserts an audit log with all parameters', async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const { createAuditLog } = await import('@/lib/services/audit-service');
      await createAuditLog({
        actorId: 'user-1',
        actorType: 'user',
        action: 'request.created',
        targetType: 'payment_request',
        targetId: 'req-1',
        metadata: { amount: 5000 },
        outcome: 'success',
      });

      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith({
        actor_id: 'user-1',
        actor_type: 'user',
        action: 'request.created',
        target_type: 'payment_request',
        target_id: 'req-1',
        metadata: { amount: 5000 },
        outcome: 'success',
      });
    });

    it('defaults metadata to empty object when not provided', async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const { createAuditLog } = await import('@/lib/services/audit-service');
      await createAuditLog({
        actorId: null,
        actorType: 'system',
        action: 'request.expired',
        targetType: 'payment_request',
        targetId: 'req-2',
        outcome: 'success',
      });

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
    });

    it('logs error to console when insert fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInsert.mockResolvedValueOnce({ error: { message: 'insert failed' } });

      const { createAuditLog } = await import('@/lib/services/audit-service');
      await createAuditLog({
        actorId: 'user-1',
        actorType: 'user',
        action: 'request.created',
        targetType: 'payment_request',
        targetId: 'req-3',
        outcome: 'failure',
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to create audit log:', 'insert failed');
      consoleSpy.mockRestore();
    });

    it('does not throw when insert fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInsert.mockResolvedValueOnce({ error: { message: 'db error' } });

      const { createAuditLog } = await import('@/lib/services/audit-service');
      await expect(
        createAuditLog({
          actorId: 'user-1',
          actorType: 'user',
          action: 'request.created',
          targetType: 'payment_request',
          targetId: 'req-4',
          outcome: 'success',
        }),
      ).resolves.toBeUndefined();
      vi.restoreAllMocks();
    });
  });
});
