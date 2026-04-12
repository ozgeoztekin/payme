import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/client';
import { processPayment } from '@/lib/services/payment-service';
import { createAuditLog } from '@/lib/services/audit-service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ActorType, AuditAction, FundingSourceType } from '@/lib/types/domain';

const guestPaySchema = z.object({
  shareToken: z.string().uuid('Invalid share token'),
  guestBankId: z.string().uuid('Invalid guest bank ID'),
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

  const parsed = guestPaySchema.safeParse(body);
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

  const { shareToken, guestBankId } = parsed.data;

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

  const { data: guestBank, error: bankError } = await supabaseAdmin
    .from('bank_accounts')
    .select('id, balance_minor, is_guest')
    .eq('id', guestBankId)
    .eq('is_guest', true)
    .single();

  if (bankError || !guestBank) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_BANK_ACCOUNT', message: 'Guest bank account not found' },
      },
      { status: 400 },
    );
  }

  if (guestBank.balance_minor < requestData.amount_minor) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Bank account balance is insufficient for this payment',
        },
      },
      { status: 400 },
    );
  }

  const result = await processPayment({
    requestId: requestData.id,
    payerId: requestData.requester_id,
    fundingSourceType: FundingSourceType.BANK_ACCOUNT,
    fundingSourceId: guestBankId,
    isGuest: true,
  });

  if (!result.success) {
    await createAuditLog({
      actorId: null,
      actorType: ActorType.GUEST,
      action: AuditAction.PAYMENT_FAILED,
      targetType: 'payment_request',
      targetId: requestData.id,
      metadata: {
        share_token: shareToken,
        guest_bank_id: guestBankId,
        error_code: result.error.code,
        error_message: result.error.message,
        ip,
      },
      outcome: 'failure',
    });

    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      transaction: {
        id: result.data.transactionId,
        type: 'payment',
        amount_minor: requestData.amount_minor,
        status: 'completed',
      },
      requestStatus: 'paid',
    },
  });
}
