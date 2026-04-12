import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/db/client';
import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_MAX_LIMIT,
} from '@/lib/constants';
import type { PaymentRequestViewRow, UserRow } from '@/lib/types/database';
import type {
  PaymentRequestListItem,
  RequestListEffectiveStatus,
  RequestListTab,
} from '@/lib/types/api';

const STATUS_VALUES: RequestListEffectiveStatus[] = [
  'pending',
  'paid',
  'declined',
  'canceled',
  'expired',
];

// Admin client bypasses RLS; filters restrict rows to what the session user may see.
function applyTabVisibilityFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  tab: RequestListTab,
  profile: Pick<UserRow, 'email' | 'phone' | 'id'>,
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any | null {
  if (tab === 'outgoing') {
    return query.eq('requester_id', profile.id);
  }

  const parts: string[] = [];
  const email = profile.email?.toLowerCase().trim();
  const phone = profile.phone?.trim();
  if (email) {
    parts.push(`and(recipient_type.eq.email,recipient_value.eq.${email})`);
  }
  if (phone) {
    parts.push(`and(recipient_type.eq.phone,recipient_value.eq.${phone})`);
  }
  if (parts.length === 0) {
    return null;
  }
  return query.or(parts.join(','));
}

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const n = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  if (max != null && n > max) return max;
  return n;
}

/** Wrap user input for Postgres ILIKE so `%` and `_` are literal. */
function ilikePattern(term: string): string {
  const escaped = term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${escaped}%`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') as RequestListTab | null;
  if (tab !== 'incoming' && tab !== 'outgoing') {
    return NextResponse.json(
      { error: 'Invalid or missing tab (incoming | outgoing)' },
      { status: 400 },
    );
  }

  const statusParam = searchParams.get('status');
  const statusFilter =
    statusParam && STATUS_VALUES.includes(statusParam as RequestListEffectiveStatus)
      ? (statusParam as RequestListEffectiveStatus)
      : null;

  const searchRaw = searchParams.get('search')?.trim() ?? '';
  const page = parsePositiveInt(searchParams.get('page'), PAGINATION_DEFAULT_PAGE);
  const limit = parsePositiveInt(
    searchParams.get('limit'),
    PAGINATION_DEFAULT_LIMIT,
    PAGINATION_MAX_LIMIT,
  );

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, phone')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const typedProfile = profile as UserRow;

  let listQuery = supabaseAdmin
    .from('payment_requests_view')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  const visibilityFiltered = applyTabVisibilityFilter(listQuery, tab, typedProfile);
  if (visibilityFiltered === null) {
    return NextResponse.json({
      requests: [],
      total: 0,
      page,
      limit,
      ...(tab === 'incoming' ? { pending_action_count: 0 } : {}),
    });
  }
  listQuery = visibilityFiltered;

  if (statusFilter) {
    listQuery = listQuery.eq('effective_status', statusFilter);
  }

  if (searchRaw.length > 0) {
    const pattern = ilikePattern(searchRaw);
    if (tab === 'outgoing') {
      listQuery = listQuery.or(`note.ilike.${pattern},recipient_value.ilike.${pattern}`);
    } else {
      const { data: hitUsers, error: userSearchError } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`display_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);

      if (userSearchError) {
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }

      const ids = hitUsers?.map((u) => u.id).filter(Boolean) ?? [];
      if (ids.length > 0) {
        listQuery = listQuery.or(`note.ilike.${pattern},requester_id.in.(${ids.join(',')})`);
      } else {
        listQuery = listQuery.ilike('note', pattern);
      }
    }
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  listQuery = listQuery.range(from, to);

  const { data: rows, error: listError, count } = await listQuery;

  if (listError) {
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }

  const viewRows = (rows ?? []) as PaymentRequestViewRow[];
  const requesterIds = [...new Set(viewRows.map((r) => r.requester_id))];

  const requesterNameById = new Map<string, string>();
  if (requesterIds.length > 0) {
    const { data: requesters, error: requestersError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .in('id', requesterIds);

    if (requestersError) {
      return NextResponse.json({ error: 'Failed to resolve requesters' }, { status: 500 });
    }

    for (const u of requesters ?? []) {
      requesterNameById.set(u.id as string, u.display_name as string);
    }
  }

  const requests: PaymentRequestListItem[] = viewRows.map((row) => ({
    id: row.id,
    requester_id: row.requester_id,
    requester_display_name: requesterNameById.get(row.requester_id) ?? 'Unknown',
    recipient_type: row.recipient_type,
    recipient_value: row.recipient_value,
    amount_minor: Number(row.amount_minor),
    currency: row.currency ?? 'USD',
    note: row.note,
    effective_status: row.effective_status,
    share_token: String(row.share_token),
    created_at: row.created_at,
    expires_at: row.expires_at,
    resolved_at: row.resolved_at,
  }));

  let pending_action_count: number | undefined;
  if (tab === 'incoming') {
    const pendingQ = supabaseAdmin
      .from('payment_requests_view')
      .select('id', { count: 'exact', head: true })
      .eq('effective_status', 'pending');
    const pendingFiltered = applyTabVisibilityFilter(pendingQ, 'incoming', typedProfile);
    if (pendingFiltered) {
      const { count: pendingCount, error: pendingErr } = await pendingFiltered;
      if (!pendingErr) {
        pending_action_count = pendingCount ?? 0;
      }
    } else {
      pending_action_count = 0;
    }
  }

  const body: {
    requests: PaymentRequestListItem[];
    total: number;
    page: number;
    limit: number;
    pending_action_count?: number;
  } = {
    requests,
    total: count ?? 0,
    page,
    limit,
  };
  if (pending_action_count !== undefined) {
    body.pending_action_count = pending_action_count;
  }

  return NextResponse.json(body);
}
