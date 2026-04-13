import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAddPhoneNumberService = vi.fn();
vi.mock('@/lib/services/profile-service', () => ({
  addPhoneNumber: (...args: unknown[]) => mockAddPhoneNumberService(...args),
}));

const mockRedirect = vi.fn();
const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

describe('profile-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addPhoneNumber', () => {
    it('returns VALIDATION_ERROR for invalid phone format', async () => {
      const { addPhoneNumber } = await import('@/lib/actions/profile-actions');
      const result = await addPhoneNumber({ phone: 'not-a-phone' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.field).toBe('phone');
      }
    });

    it('returns UNAUTHORIZED when not signed in', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { addPhoneNumber } = await import('@/lib/actions/profile-actions');
      const result = await addPhoneNumber({ phone: '+15551234567' });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    });

    it('redirects to profile on success', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAddPhoneNumberService.mockResolvedValueOnce({
        success: true,
        data: { phone: '+15551234567' },
      });

      const { addPhoneNumber } = await import('@/lib/actions/profile-actions');
      await addPhoneNumber({ phone: '+15551234567' });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
      expect(mockRedirect).toHaveBeenCalledWith('/profile?phone_added=true');
    });

    it('returns service error on failure', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
      mockAddPhoneNumberService.mockResolvedValueOnce({
        success: false,
        error: { code: 'PHONE_ALREADY_SET', message: 'Already set' },
      });

      const { addPhoneNumber } = await import('@/lib/actions/profile-actions');
      const result = await addPhoneNumber({ phone: '+15551234567' });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('PHONE_ALREADY_SET');
    });
  });
});
