import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServerClient } from '@supabase/ssr';

const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([{ name: 'sb-token', value: 'abc' }]),
  set: vi.fn(),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn() },
  }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

describe('supabase/server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  it('creates a server client', async () => {
    vi.resetModules();
    const { createClient } = await import('@/lib/supabase/server');
    const client = await createClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('passes cookie handlers that read and write cookies', async () => {
    vi.resetModules();
    const { createClient } = await import('@/lib/supabase/server');
    await createClient();

    const callArgs = vi.mocked(createServerClient).mock.calls[0];
    const cookieConfig = callArgs[2] as {
      cookies: {
        getAll: () => unknown;
        setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => void;
      };
    };

    const cookies = cookieConfig.cookies;
    const allCookies = cookies.getAll();
    expect(allCookies).toEqual([{ name: 'sb-token', value: 'abc' }]);

    cookies.setAll([{ name: 'test', value: 'val', options: {} }]);
    expect(mockCookieStore.set).toHaveBeenCalledWith('test', 'val', {});
  });

  it('swallows errors in setAll (server component context)', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('Read-only cookies');
    });

    vi.resetModules();
    const { createClient } = await import('@/lib/supabase/server');
    await createClient();

    const callArgs = vi.mocked(createServerClient).mock.calls[0];
    const cookieConfig = callArgs[2] as {
      cookies: { setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => void };
    };

    expect(() => {
      cookieConfig.cookies.setAll([{ name: 'test', value: 'val' }]);
    }).not.toThrow();
  });
});
