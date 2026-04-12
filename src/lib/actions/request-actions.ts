'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/db/client';
import { validateCreateRequest } from '@/lib/validators/request-validators';
import {
  createRequest as createRequestService,
  declineRequest as declineRequestService,
  cancelRequest as cancelRequestService,
} from '@/lib/services/request-service';
import type { ActionResult, CreateRequestInput } from '@/lib/types/api';
import type { PaymentRequestRow } from '@/lib/types/database';

interface CreateRequestData {
  request: PaymentRequestRow;
  shareUrl: string;
}

export async function createRequest(
  input: CreateRequestInput,
): Promise<ActionResult<CreateRequestData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in' },
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, phone, status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
    };
  }

  if (profile.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'USER_INACTIVE',
        message: 'Your account is not active. Please contact support.',
      },
    };
  }

  const validation = validateCreateRequest(input, {
    email: profile.email,
    phone: profile.phone,
  });

  if (!validation.success) {
    return validation;
  }

  return createRequestService({
    requesterId: user.id,
    recipientType: validation.data.recipientType,
    recipientValue: validation.data.recipientValue,
    amountMinor: validation.data.amountMinor,
    currency: validation.data.currency,
    note: validation.data.note,
  });
}

export async function declineRequest(
  requestId: string,
): Promise<ActionResult<{ requestId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in' },
    };
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('email, phone, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return {
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
    };
  }

  if (profile.status !== 'active') {
    return {
      success: false,
      error: { code: 'USER_INACTIVE', message: 'Your account is not active' },
    };
  }

  const { data: request } = await supabaseAdmin
    .from('payment_requests_view')
    .select('recipient_type, recipient_value')
    .eq('id', requestId)
    .single();

  if (!request) {
    return {
      success: false,
      error: { code: 'REQUEST_NOT_FOUND', message: 'Payment request not found' },
    };
  }

  const isRecipientByEmail =
    request.recipient_type === 'email' &&
    profile.email?.toLowerCase() === request.recipient_value.toLowerCase();

  const isRecipientByPhone =
    request.recipient_type === 'phone' && profile.phone === request.recipient_value;

  if (!isRecipientByEmail && !isRecipientByPhone) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only the recipient can decline this request' },
    };
  }

  const result = await declineRequestService(requestId, user.id);
  if (!result.success) return result;

  return { success: true, data: { requestId } };
}

export async function cancelRequest(
  requestId: string,
): Promise<ActionResult<{ requestId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in' },
    };
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return {
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
    };
  }

  if (profile.status !== 'active') {
    return {
      success: false,
      error: { code: 'USER_INACTIVE', message: 'Your account is not active' },
    };
  }

  const result = await cancelRequestService(requestId, user.id);
  if (!result.success) return result;

  return { success: true, data: { requestId } };
}
