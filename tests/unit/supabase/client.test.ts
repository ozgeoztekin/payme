import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn() },
  }),
}));

describe('supabase/client (browser)', () => {
  it('creates a browser client', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

    const { createClient } = await import('@/lib/supabase/client');
    const client = createClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
