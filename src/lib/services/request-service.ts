import { supabaseAdmin } from '@/lib/db/client';
import { createAuditLog } from '@/lib/services/audit-service';
import { VALID_TRANSITIONS, RequestStatus, AuditAction, ActorType } from '@/lib/types/domain';
import type { ActionResult } from '@/lib/types/api';
import type { PaymentRequestRow } from '@/lib/types/database';

export function validateTransition(from: RequestStatus, to: RequestStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

interface CreateRequestParams {
  requesterId: string;
  recipientType: 'email' | 'phone';
  recipientValue: string;
  amountMinor: number;
  currency: string;
  note?: string;
}

interface CreateRequestResult {
  request: PaymentRequestRow;
  shareUrl: string;
}

export async function createRequest(
  params: CreateRequestParams,
): Promise<ActionResult<CreateRequestResult>> {
  const { requesterId, recipientType, recipientValue, amountMinor, currency, note } = params;

  const { data: request, error } = await supabaseAdmin
    .from('payment_requests')
    .insert({
      requester_id: requesterId,
      recipient_type: recipientType,
      recipient_value: recipientValue.toLowerCase().trim(),
      amount_minor: amountMinor,
      currency,
      note: note || null,
    })
    .select()
    .single();

  if (error || !request) {
    return {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error?.message ?? 'Failed to create payment request',
      },
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const shareUrl = `${appUrl}/pay/${request.share_token}`;

  await createAuditLog({
    actorId: requesterId,
    actorType: ActorType.USER,
    action: AuditAction.REQUEST_CREATED,
    targetType: 'payment_request',
    targetId: request.id,
    metadata: {
      recipient_type: recipientType,
      recipient_value: recipientValue,
      amount_minor: amountMinor,
      currency,
    },
    outcome: 'success',
  });

  return {
    success: true,
    data: {
      request: request as PaymentRequestRow,
      shareUrl,
    },
  };
}

export async function declineRequest(
  requestId: string,
  userId: string,
): Promise<ActionResult<{ request: Pick<PaymentRequestRow, 'id' | 'status' | 'resolved_at'> }>> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('payment_requests_view')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !existing) {
    return {
      success: false,
      error: { code: 'REQUEST_NOT_FOUND', message: 'Payment request not found' },
    };
  }

  if (existing.effective_status !== 'pending') {
    if (isExpired(existing.expires_at)) {
      return {
        success: false,
        error: { code: 'REQUEST_EXPIRED', message: 'This request has expired' },
      };
    }
    return {
      success: false,
      error: { code: 'REQUEST_NOT_PENDING', message: 'Request is no longer pending' },
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('payment_requests')
    .update({ status: 'declined', resolved_at: now })
    .eq('id', requestId)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .select('id, status, resolved_at')
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Failed to decline request' },
    };
  }

  await createAuditLog({
    actorId: userId,
    actorType: ActorType.USER,
    action: AuditAction.REQUEST_DECLINED,
    targetType: 'payment_request',
    targetId: requestId,
    outcome: 'success',
  });

  return { success: true, data: { request: updated } };
}

export async function cancelRequest(
  requestId: string,
  userId: string,
): Promise<ActionResult<{ request: Pick<PaymentRequestRow, 'id' | 'status' | 'resolved_at'> }>> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('payment_requests_view')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !existing) {
    return {
      success: false,
      error: { code: 'REQUEST_NOT_FOUND', message: 'Payment request not found' },
    };
  }

  if (existing.requester_id !== userId) {
    return {
      success: false,
      error: { code: 'NOT_REQUESTER', message: 'Only the requester can cancel this request' },
    };
  }

  if (existing.effective_status !== 'pending') {
    if (isExpired(existing.expires_at)) {
      return {
        success: false,
        error: { code: 'REQUEST_EXPIRED', message: 'This request has expired' },
      };
    }
    return {
      success: false,
      error: { code: 'REQUEST_NOT_PENDING', message: 'Request is no longer pending' },
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('payment_requests')
    .update({ status: 'canceled', resolved_at: now })
    .eq('id', requestId)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .select('id, status, resolved_at')
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Failed to cancel request' },
    };
  }

  await createAuditLog({
    actorId: userId,
    actorType: ActorType.USER,
    action: AuditAction.REQUEST_CANCELED,
    targetType: 'payment_request',
    targetId: requestId,
    outcome: 'success',
  });

  return { success: true, data: { request: updated } };
}
