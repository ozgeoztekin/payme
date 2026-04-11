import { z } from 'zod';
import { phoneSchema } from './common-validators';

export const addPhoneSchema = z.object({
  phone: z.string().trim().pipe(phoneSchema),
});
