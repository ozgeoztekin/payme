import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServerClient } from '@supabase/ssr';

const mockResponseCookiesSet = vi.fn();
const mockNextResponse = {
  next: vi.fn().mockReturnValue({
    cookies: { set: mockResponseCookiesSet },
  }),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }),
    },
  }),
}));

vi.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}));

describe('supabase/middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  it('updates session and returns user and response', async () => {
    vi.resetModules();
    const { updateSession } = await import('@/lib/supabase/middleware');

    const mockRequest = {
      cookies: {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateSession(mockRequest as any);

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('supabaseResponse');
  });

  it('passes cookie handlers that read and write cookies', async () => {
    vi.resetModules();
    const { updateSession } = await import('@/lib/supabase/middleware');

    const mockRequestCookies = {
      getAll: vi.fn().mockReturnValue([{ name: 'sb', value: 'tok' }]),
      set: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateSession({ cookies: mockRequestCookies } as any);

    const callArgs = vi.mocked(createServerClient).mock.calls[0];
    const cookieConfig = callArgs[2] as {
      cookies: {
        getAll: () => unknown;
        setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => void;
      };
    };

    const allCookies = cookieConfig.cookies.getAll();
    expect(allCookies).toEqual([{ name: 'sb', value: 'tok' }]);

    cookieConfig.cookies.setAll([{ name: 'new', value: 'val', options: { path: '/' } }]);
    expect(mockRequestCookies.set).toHaveBeenCalledWith('new', 'val');
    expect(mockResponseCookiesSet).toHaveBeenCalledWith('new', 'val', { path: '/' });
  });
});
