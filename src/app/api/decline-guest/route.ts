import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/client';
import { createAuditLog } from '@/lib/services/audit-service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ActorType, AuditAction } from '@/lib/types/domain';

const guestDeclineSchema = z.object({
  shareToken: z.string().uuid('Invalid share token'),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  const parsed = guestDeclineSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstIssue.message,
          field: firstIssue.path.join('.'),
        },
      },
      { status: 400 },
    );
  }

  const { shareToken } = parsed.data;

  const { data: requestData, error: reqError } = await supabaseAdmin
    .from('payment_requests_view')
    .select('*')
    .eq('share_token', shareToken)
    .single();

  if (reqError || !requestData) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'REQUEST_NOT_FOUND', message: 'Payment request not found' },
      },
      { status: 404 },
    );
  }

  if (requestData.effective_status === 'expired') {
    return NextResponse.json(
      { success: false, error: { code: 'REQUEST_EXPIRED', message: 'This request has expired' } },
      { status: 400 },
    );
  }

  if (requestData.effective_status !== 'pending') {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'REQUEST_NOT_PENDING', message: 'This request is no longer pending' },
      },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('payment_requests')
    .update({ status: 'declined', resolved_at: new Date().toISOString() })
    .eq('id', requestData.id)
    .eq('status', 'pending')
    .select('id, status, resolved_at')
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to decline request' } },
      { status: 500 },
    );
  }

  await createAuditLog({
    actorId: null,
    actorType: ActorType.GUEST,
    action: AuditAction.REQUEST_DECLINED,
    targetType: 'payment_request',
    targetId: requestData.id,
    metadata: { share_token: shareToken, ip },
    outcome: 'success',
  });

  return NextResponse.json({
    success: true,
    data: {
      request: {
        id: updated.id,
        status: updated.status,
        resolved_at: updated.resolved_at,
      },
    },
  });
}
