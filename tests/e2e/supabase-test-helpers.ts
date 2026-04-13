import type { APIRequestContext } from '@playwright/test';

/**
 * Resolves public.users.id for an email (matches the signed-in user's profile row).
 * Use this instead of hardcoded seed UUIDs when running against staging/production auth.
 */
export async function getPublicUserIdByEmail(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await request.get(
    `${supabaseUrl}/rest/v1/users?select=id&email=eq.${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!res.ok()) {
    throw new Error(`Failed to resolve user id for ${email}: ${res.status()} ${await res.text()}`);
  }

  const rows = (await res.json()) as { id: string }[];
  const id = rows?.[0]?.id;
  if (!id) {
    throw new Error(`No public.users row for email ${email}`);
  }
  return id;
}
