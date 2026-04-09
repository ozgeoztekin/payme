import { z } from 'zod';
import { emailSchema, phoneSchema, amountCentsSchema, noteSchema } from './common-validators';
import type { ActionResult } from '@/lib/types/api';

export const createRequestSchema = z
  .object({
    recipientType: z.enum(['email', 'phone']),
    recipientValue: z.string(),
    amountCents: amountCentsSchema,
    note: noteSchema.or(z.literal('')).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recipientType === 'email') {
      const result = emailSchema.safeParse(data.recipientValue);
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid email format',
          path: ['recipientValue'],
        });
      }
    } else {
      const result = phoneSchema.safeParse(data.recipientValue);
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must be E.164 format (e.g., +15551234567)',
          path: ['recipientValue'],
        });
      }
    }
  });

export type CreateRequestFormData = z.infer<typeof createRequestSchema>;

interface SenderContact {
  email: string | null;
  phone: string | null;
}

export function validateCreateRequest(
  input: unknown,
  sender: SenderContact,
): ActionResult<CreateRequestFormData> {
  const parsed = createRequestSchema.safeParse(input);
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

  const { recipientType, recipientValue } = parsed.data;
  const normalizedRecipient = recipientValue.toLowerCase().trim();

  const isSelfByEmail =
    recipientType === 'email' &&
    sender.email &&
    sender.email.toLowerCase().trim() === normalizedRecipient;

  const isSelfByPhone =
    recipientType === 'phone' &&
    sender.phone &&
    sender.phone === normalizedRecipient;

  if (isSelfByEmail || isSelfByPhone) {
    return {
      success: false,
      error: {
        code: 'SELF_REQUEST',
        message: 'You cannot request money from yourself',
        field: 'recipientValue',
      },
    };
  }

  return { success: true, data: parsed.data };
}
