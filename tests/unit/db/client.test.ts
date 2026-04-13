import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ select: vi.fn() }),
    auth: { getUser: vi.fn() },
  }),
}));

describe('db/client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getSupabaseAdmin', () => {
    it('throws when env vars are missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

      vi.resetModules();
      const { getSupabaseAdmin } = await import('@/lib/db/client');

      expect(() => getSupabaseAdmin()).toThrow(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
      );
    });

    it('creates a client when env vars are set', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

      vi.resetModules();
      const { getSupabaseAdmin } = await import('@/lib/db/client');

      const client = getSupabaseAdmin();
      expect(client).toBeDefined();
    });

    it('returns the same client on subsequent calls', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test2.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key-2');

      vi.resetModules();
      const { getSupabaseAdmin } = await import('@/lib/db/client');

      const client1 = getSupabaseAdmin();
      const client2 = getSupabaseAdmin();
      expect(client1).toBe(client2);
    });
  });

  describe('supabaseAdmin proxy', () => {
    it('proxies method calls to the underlying client', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test3.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key-3');

      vi.resetModules();
      const { supabaseAdmin } = await import('@/lib/db/client');

      expect(supabaseAdmin.from).toBeDefined();
      expect(typeof supabaseAdmin.from).toBe('function');
    });

    it('allows setting properties via proxy', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test4.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key-4');

      vi.resetModules();
      const { supabaseAdmin } = await import('@/lib/db/client');

      const mockFn = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdmin.from = mockFn as any;
      expect(supabaseAdmin.from).toBe(mockFn);
    });
  });
});
