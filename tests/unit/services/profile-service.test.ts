import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/db/client', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const activeUserWithPhone = {
  id: 'user-1',
  email: 'alice@example.com',
  phone: '+15551234567',
  status: 'active',
  display_name: 'Alice',
};

const activeUserNoPhone = {
  id: 'user-2',
  email: 'bob@example.com',
  phone: null,
  status: 'active',
  display_name: 'Bob',
};

describe('profile-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  describe('getProfile', () => {
    it('returns profile data for a user with phone', async () => {
      mockSingle.mockResolvedValueOnce({ data: activeUserWithPhone, error: null });

      const { getProfile } = await import('@/lib/services/profile-service');
      const result = await getProfile('user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('alice@example.com');
        expect(result.data.phone).toBe('+15551234567');
        expect(result.data.status).toBe('active');
        expect(result.data.display_name).toBe('Alice');
      }
    });

    it('returns profile data for a user without phone', async () => {
      mockSingle.mockResolvedValueOnce({ data: activeUserNoPhone, error: null });

      const { getProfile } = await import('@/lib/services/profile-service');
      const result = await getProfile('user-2');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('bob@example.com');
        expect(result.data.phone).toBeNull();
        expect(result.data.display_name).toBe('Bob');
      }
    });

    it('returns NOT_FOUND when user does not exist', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      const { getProfile } = await import('@/lib/services/profile-service');
      const result = await getProfile('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('addPhoneNumber', () => {
    const mockUpdateSingle = vi.fn();
    const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
    const mockUpdateEqStatus = vi.fn().mockReturnValue({ select: mockUpdateSelect });
    const mockUpdateIsNull = vi.fn().mockReturnValue({ eq: mockUpdateEqStatus });
    const mockUpdateEqId = vi.fn().mockReturnValue({ is: mockUpdateIsNull });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEqId });

    beforeEach(() => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return { select: mockSelect };
      });
    });

    it('successfully adds a phone number for an active user with no phone', async () => {
      mockSingle.mockResolvedValueOnce({ data: activeUserNoPhone, error: null });
      mockUpdateSingle.mockResolvedValueOnce({
        data: { phone: '+19998887777' },
        error: null,
      });

      const { addPhoneNumber } = await import('@/lib/services/profile-service');
      const result = await addPhoneNumber('user-2', '+19998887777');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe('+19998887777');
      }
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ phone: '+19998887777' }));
    });

    it('rejects when phone number is already in use (unique constraint)', async () => {
      mockSingle.mockResolvedValueOnce({ data: activeUserNoPhone, error: null });
      mockUpdateSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'unique constraint violation', code: '23505' },
      });

      const { addPhoneNumber } = await import('@/lib/services/profile-service');
      const result = await addPhoneNumber('user-2', '+15551234567');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PHONE_UNAVAILABLE');
      }
    });

    it('rejects when user is inactive', async () => {
      const inactiveUser = { ...activeUserNoPhone, status: 'inactive' };
      mockSingle.mockResolvedValueOnce({ data: inactiveUser, error: null });

      const { addPhoneNumber } = await import('@/lib/services/profile-service');
      const result = await addPhoneNumber('user-2', '+19998887777');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INACTIVE_ACCOUNT');
      }
    });

    it('rejects when user already has a phone number (overwrite prevention)', async () => {
      mockSingle.mockResolvedValueOnce({ data: activeUserWithPhone, error: null });

      const { addPhoneNumber } = await import('@/lib/services/profile-service');
      const result = await addPhoneNumber('user-1', '+19998887777');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PHONE_ALREADY_SET');
      }
    });

    it('returns NOT_FOUND when user does not exist', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      const { addPhoneNumber } = await import('@/lib/services/profile-service');
      const result = await addPhoneNumber('nonexistent', '+19998887777');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('returns PHONE_ALREADY_SET when update returns no data and no unique error', async () => {
      mockSingle.mockResolvedValueOnce({ data: activeUserNoPhone, error: null });
      mockUpdateSingle.mockResolvedValueOnce({ data: null, error: null });

      const { addPhoneNumber } = await import('@/lib/services/profile-service');
      const result = await addPhoneNumber('user-2', '+19998887777');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PHONE_ALREADY_SET');
      }
    });

    it('returns INTERNAL_ERROR for non-unique db error with no data', async () => {
      mockSingle.mockResolvedValueOnce({ data: activeUserNoPhone, error: null });
      mockUpdateSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'connection timeout', code: '57014' },
      });

      const { addPhoneNumber } = await import('@/lib/services/profile-service');
      const result = await addPhoneNumber('user-2', '+19998887777');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_ERROR');
      }
    });
  });

  describe('ensureProfile', () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    beforeEach(() => {
      mockFrom.mockImplementation(() => ({
        select: mockSelect,
        upsert: mockUpsert,
      }));
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
    });

    it('does nothing when profile already exists', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'user-1' }, error: null });

      const { ensureProfile } = await import('@/lib/services/profile-service');
      await ensureProfile({
        id: 'user-1',
        email: 'test@test.com',
        user_metadata: {},
      } as Parameters<typeof ensureProfile>[0]);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('creates profile and wallet when user does not exist', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const { ensureProfile } = await import('@/lib/services/profile-service');
      await ensureProfile({
        id: 'user-new',
        email: 'new@test.com',
        phone: '+15551234567',
        user_metadata: { display_name: 'New User' },
      } as Parameters<typeof ensureProfile>[0]);

      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('uses email username as display name fallback', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const { ensureProfile } = await import('@/lib/services/profile-service');
      await ensureProfile({
        id: 'user-email',
        email: 'alice@example.com',
        user_metadata: {},
      } as Parameters<typeof ensureProfile>[0]);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'alice' }),
        expect.anything(),
      );
    });

    it('falls back to "User" when no email or display_name', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const { ensureProfile } = await import('@/lib/services/profile-service');
      await ensureProfile({
        id: 'user-noemail',
        email: undefined,
        user_metadata: {},
      } as Parameters<typeof ensureProfile>[0]);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'User' }),
        expect.anything(),
      );
    });
  });
});
