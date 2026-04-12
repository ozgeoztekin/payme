import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/** Lazily creates the Supabase admin client (avoids createClient at import time during `next build`). */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for server-side Supabase admin access.',
    );
  }
  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

/** Property overrides for tests that patch `supabaseAdmin.from` on the real module. */
const adminOverrides: Partial<Record<string | symbol, unknown>> = {};

function hasAdminOverride(prop: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(adminOverrides, prop);
}

/**
 * Server-side admin client (service role). Resolved lazily on first use so route modules
 * can load during Next.js build without env at import time.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop): unknown {
    if (hasAdminOverride(prop)) {
      return adminOverrides[prop as string];
    }
    const client = getSupabaseAdmin();
    const value = Reflect.get(client as object, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(_target, prop, value) {
    adminOverrides[prop as string] = value;
    return true;
  },
});
