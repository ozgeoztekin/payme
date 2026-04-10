import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/client';
import { createAuditLog } from '@/lib/services/audit-service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MOCKED_BANK_BALANCE_CENTS } from '@/lib/constants';
import { ActorType, AuditAction } from '@/lib/types/domain';

const guestBankSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumberLast4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
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

  const parsed = guestBankSchema.safeParse(body);
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

  const { bankName, accountNumberLast4 } = parsed.data;
  const maskedNumber = `••••${accountNumberLast4}`;

  const { data: bankAccount, error: insertError } = await supabaseAdmin
    .from('bank_accounts')
    .insert({
      user_id: null,
      bank_name: bankName,
      account_number_masked: maskedNumber,
      balance_cents: MOCKED_BANK_BALANCE_CENTS,
      is_guest: true,
    })
    .select()
    .single();

  if (insertError || !bankAccount) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create guest bank account' },
      },
      { status: 500 },
    );
  }

  await createAuditLog({
    actorId: null,
    actorType: ActorType.GUEST,
    action: AuditAction.BANK_CONNECTED,
    targetType: 'bank_account',
    targetId: bankAccount.id,
    metadata: { bank_name: bankName, is_guest: true, ip },
    outcome: 'success',
  });

  return NextResponse.json({
    success: true,
    data: {
      guestBankId: bankAccount.id,
      bankName: bankAccount.bank_name,
      accountNumberMasked: bankAccount.account_number_masked,
      balanceCents: bankAccount.balance_cents,
    },
  });
}
