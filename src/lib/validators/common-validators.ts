import { z } from 'zod';
import {
  AMOUNT_MIN_MINOR,
  AMOUNT_MAX_MINOR,
  NOTE_MAX_LENGTH,
  SUPPORTED_CURRENCIES,
} from '@/lib/constants';

export const emailSchema = z.string().email('Invalid email format');

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format (e.g., +15551234567)');

export const amountMinorSchema = z
  .number()
  .int('Amount must be a whole number')
  .min(AMOUNT_MIN_MINOR, `Minimum amount is $${(AMOUNT_MIN_MINOR / 100).toFixed(2)}`)
  .max(AMOUNT_MAX_MINOR, `Maximum amount is $${(AMOUNT_MAX_MINOR / 100).toFixed(2)}`);

export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

export const noteSchema = z
  .string()
  .max(NOTE_MAX_LENGTH, `Note must be ${NOTE_MAX_LENGTH} characters or less`)
  .optional();

export const uuidSchema = z.string().uuid('Invalid ID format');
