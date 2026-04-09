'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/db/client';
import { validateCreateRequest } from '@/lib/validators/request-validators';
import { createRequest as createRequestService } from '@/lib/services/request-service';
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
    amountCents: validation.data.amountCents,
    note: validation.data.note,
  });
}
