import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock('@/lib/services/profile-service', () => ({
  ensureProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

describe('auth-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('signs in and redirects to dashboard on success', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@test.com' } },
      });

      const { signIn } = await import('@/lib/actions/auth-actions');
      const formData = new FormData();
      formData.set('email', 'test@test.com');
      formData.set('password', 'password123');

      await signIn(formData);

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
      expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    });

    it('returns error on sign-in failure', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid credentials' },
      });

      const { signIn } = await import('@/lib/actions/auth-actions');
      const formData = new FormData();
      formData.set('email', 'test@test.com');
      formData.set('password', 'wrong');

      const result = await signIn(formData);

      expect(result).toEqual({ error: 'Invalid credentials' });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('calls ensureProfile when user exists', async () => {
      const { ensureProfile } = await import('@/lib/services/profile-service');
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-2', email: 'u@t.com' } },
      });

      const { signIn } = await import('@/lib/actions/auth-actions');
      const formData = new FormData();
      formData.set('email', 'u@t.com');
      formData.set('password', 'pass');

      await signIn(formData);

      expect(ensureProfile).toHaveBeenCalled();
    });

    it('redirects even when getUser returns no user (edge case)', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { signIn } = await import('@/lib/actions/auth-actions');
      const formData = new FormData();
      formData.set('email', 'test@test.com');
      formData.set('password', 'pass');

      await signIn(formData);

      expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('signUp', () => {
    it('returns success on successful sign-up', async () => {
      mockSignUp.mockResolvedValueOnce({ error: null });

      const { signUp } = await import('@/lib/actions/auth-actions');
      const formData = new FormData();
      formData.set('email', 'new@test.com');
      formData.set('password', 'password123');

      const result = await signUp(formData);

      expect(result).toEqual({ success: true });
    });

    it('returns error on sign-up failure', async () => {
      mockSignUp.mockResolvedValueOnce({
        error: { message: 'Email already registered' },
      });

      const { signUp } = await import('@/lib/actions/auth-actions');
      const formData = new FormData();
      formData.set('email', 'existing@test.com');
      formData.set('password', 'password123');

      const result = await signUp(formData);

      expect(result).toEqual({ error: 'Email already registered' });
    });
  });

  describe('signOut', () => {
    it('signs out and redirects to login', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      });
      mockSignOut.mockResolvedValueOnce({ error: null });

      const { signOut } = await import('@/lib/actions/auth-actions');
      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });

    it('still signs out if audit log fails', async () => {
      const { createAuditLog } = await import('@/lib/services/audit-service');
      vi.mocked(createAuditLog).mockRejectedValueOnce(new Error('audit failed'));

      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      });
      mockSignOut.mockResolvedValueOnce({ error: null });

      const { signOut } = await import('@/lib/actions/auth-actions');
      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });

    it('signs out without audit log when no user', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      mockSignOut.mockResolvedValueOnce({ error: null });

      const { signOut } = await import('@/lib/actions/auth-actions');
      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });
  });
});
