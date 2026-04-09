import { z } from 'zod';
import { uuidSchema } from './common-validators';
import type { ActionResult } from '@/lib/types/api';

export const payRequestSchema = z.object({
  requestId: uuidSchema,
  fundingSource: z.enum(['wallet', 'bank_account']),
});

export type PayRequestFormData = z.infer<typeof payRequestSchema>;

export function validatePayRequest(input: unknown): ActionResult<PayRequestFormData> {
  const parsed = payRequestSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue.message,
        field: firstIssue.path.join('.'),
      },
    };
  }

  return { success: true, data: parsed.data };
}
