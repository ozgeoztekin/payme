'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addPhoneSchema } from '@/lib/validators/profile-validators';
import { addPhoneNumber as addPhoneNumberService } from '@/lib/services/profile-service';
import type { ActionResult } from '@/lib/types/api';

export async function addPhoneNumber(input: {
  phone: string;
}): Promise<ActionResult<{ phone: string }>> {
  const parsed = addPhoneSchema.safeParse(input);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstError?.message ?? 'Invalid phone number.',
        field: 'phone',
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' },
    };
  }

  const result = await addPhoneNumberService(user.id, parsed.data.phone);

  if (result.success) {
    revalidatePath('/profile');
    redirect('/profile?phone_added=true');
  }

  return result;
}
