#!/usr/bin/env node
/**
 * Clears PayMe data for E2E test users (alice@test.com, bob@test.com) using the
 * Supabase service role (REST + Auth Admin API), then re-runs supabase/seed.sql
 * via the Supabase CLI (`db query`).
 *
 * Requirements:
 * - .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - Supabase CLI: npx supabase
 * - Local seed: supabase start (default: db query --local)
 * - Linked seed: supabase link, then pnpm run reset:e2e-data:linked
 *
 * Usage:
 *   pnpm run reset:e2e-data
 *   node scripts/reset-e2e-data.mjs --no-seed
 *   pnpm run reset:e2e-data:linked
 */

import { spawnSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(ROOT, '.env.local') });

const TEST_EMAILS = ['alice@test.com', 'bob@test.com'];

function parseArgs(argv) {
  return {
    noSeed: argv.includes('--no-seed'),
    linkedSeed: argv.includes('--linked-seed'),
  };
}

async function collectUserIds(admin) {
  const ids = new Set();

  const { data: profiles, error: profileError } = await admin
    .from('users')
    .select('id')
    .in(
      'email',
      TEST_EMAILS.map((e) => e.toLowerCase()),
    );

  if (profileError) {
    throw new Error(`Failed to read public.users: ${profileError.message}`);
  }

  for (const row of profiles ?? []) {
    ids.add(row.id);
  }

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const users = data?.users ?? [];
    for (const u of users) {
      const email = u.email?.toLowerCase();
      if (email && TEST_EMAILS.includes(email)) {
        ids.add(u.id);
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return [...ids];
}

async function clearAppDataForUsers(admin, ids) {
  if (ids.length === 0) return;

  const { data: requests, error: reqErr } = await admin
    .from('payment_requests')
    .select('id')
    .in('requester_id', ids);

  if (reqErr) {
    throw new Error(`Failed to list payment_requests: ${reqErr.message}`);
  }

  const requestIds = (requests ?? []).map((r) => r.id);

  if (requestIds.length > 0) {
    const { error: txErr } = await admin
      .from('payment_transactions')
      .delete()
      .in('request_id', requestIds);
    if (txErr) {
      throw new Error(`Failed to delete payment_transactions by request_id: ${txErr.message}`);
    }
  }

  const { error: txPayerErr } = await admin
    .from('payment_transactions')
    .delete()
    .in('payer_id', ids);
  if (txPayerErr) {
    throw new Error(`Failed to delete payment_transactions by payer_id: ${txPayerErr.message}`);
  }

  const { error: txRecErr } = await admin
    .from('payment_transactions')
    .delete()
    .in('recipient_id', ids);
  if (txRecErr) {
    throw new Error(`Failed to delete payment_transactions by recipient_id: ${txRecErr.message}`);
  }

  const { error: prErr } = await admin.from('payment_requests').delete().in('requester_id', ids);
  if (prErr) {
    throw new Error(`Failed to delete payment_requests: ${prErr.message}`);
  }

  const { error: bankErr } = await admin.from('bank_accounts').delete().in('user_id', ids);
  if (bankErr) {
    throw new Error(`Failed to delete bank_accounts: ${bankErr.message}`);
  }

  const { error: wErr } = await admin.from('wallets').delete().in('user_id', ids);
  if (wErr) {
    throw new Error(`Failed to delete wallets: ${wErr.message}`);
  }

  const { error: auditErr } = await admin.from('audit_logs').delete().in('actor_id', ids);
  if (auditErr) {
    throw new Error(`Failed to delete audit_logs: ${auditErr.message}`);
  }

  const { error: uErr } = await admin.from('users').delete().in('id', ids);
  if (uErr) {
    throw new Error(`Failed to delete public.users: ${uErr.message}`);
  }
}

async function deleteAuthUsers(admin, ids) {
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error && !/not found|User not found/i.test(error.message)) {
      throw new Error(`Failed to delete auth user ${id}: ${error.message}`);
    }
  }
}

function runSeed(linked) {
  const args = [
    'supabase',
    'db',
    'query',
    '-f',
    'supabase/seed.sql',
    linked ? '--linked' : '--local',
  ];
  const r = spawnSync('npx', args, { cwd: ROOT, stdio: 'inherit' });
  if (r.error) {
    throw r.error;
  }
  if (r.status !== 0 && r.status !== null) {
    process.exit(r.status);
  }
}

async function main() {
  const { noSeed, linkedSeed } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Collecting E2E test user ids (alice, bob)…');
  const ids = await collectUserIds(admin);
  console.log(`Found ${ids.length} user id(s) to clear.`);

  if (ids.length > 0) {
    console.log('Deleting app rows for those users…');
    await clearAppDataForUsers(admin, ids);
    console.log('Deleting auth users…');
    await deleteAuthUsers(admin, ids);
    console.log('Clear complete.');
  } else {
    console.log('No matching users in DB; skipping data delete.');
  }

  if (noSeed) {
    console.log('--no-seed: not running seed.sql');
    return;
  }

  const isLocalUrl = /127\.0\.0\.1|localhost/i.test(url);
  if (!linkedSeed && !isLocalUrl) {
    console.warn(
      'Warning: NEXT_PUBLIC_SUPABASE_URL looks non-local, but seed will use --local (CLI default).\n' +
        '  Use pnpm run reset:e2e-data:linked (or --linked-seed) for a linked remote project, or point .env.local at local Supabase.',
    );
  }

  console.log(
    linkedSeed
      ? 'Running seed.sql against linked project…'
      : 'Running seed.sql against local database…',
  );
  runSeed(linkedSeed);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
