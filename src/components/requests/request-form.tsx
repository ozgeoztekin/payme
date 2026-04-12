'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/ui/error-message';
import { cn, parseAmountToCents, sanitizeAmountInput } from '@/lib/utils';
import { NOTE_MAX_LENGTH, AMOUNT_MIN_CENTS, AMOUNT_MAX_CENTS } from '@/lib/constants';
import type { CreateRequestInput } from '@/lib/types/api';

type RecipientType = 'email' | 'phone';

interface RequestFormProps {
  onSubmit: (input: CreateRequestInput) => Promise<{
    success: boolean;
    error?: { code: string; message: string; field?: string };
  }>;
}

export function RequestForm({ onSubmit }: RequestFormProps) {
  const [recipientType, setRecipientType] = useState<RecipientType>('email');
  const [recipientValue, setRecipientValue] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [note, setNote] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleAmountChange(value: string) {
    const sanitized = sanitizeAmountInput(value);
    if (sanitized === null) return;
    setAmountDisplay(sanitized);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.amountCents;
      return next;
    });
  }

  function handleSubmit() {
    setFieldErrors({});
    setGeneralError('');

    const amountCents = parseAmountToCents(amountDisplay);

    if (amountCents < AMOUNT_MIN_CENTS) {
      setFieldErrors({ amountCents: 'Minimum amount is $0.01' });
      return;
    }
    if (amountCents > AMOUNT_MAX_CENTS) {
      setFieldErrors({ amountCents: 'Maximum amount is $10,000.00' });
      return;
    }
    if (!recipientValue.trim()) {
      setFieldErrors({
        recipientValue:
          recipientType === 'email' ? 'Email is required' : 'Phone number is required',
      });
      return;
    }

    startTransition(async () => {
      const input: CreateRequestInput = {
        recipientType,
        recipientValue: recipientValue.trim(),
        amountCents,
        note: note.trim() || undefined,
      };

      const result = await onSubmit(input);

      if (!result.success && result.error) {
        if (result.error.field) {
          setFieldErrors({ [result.error.field]: result.error.message });
        } else {
          setGeneralError(result.error.message);
        }
      }
    });
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {generalError && (
        <ErrorMessage message={generalError} onDismiss={() => setGeneralError('')} />
      )}

      {/* Amount Input — editorial style inspired by Stitch design */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col items-start gap-3">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Amount to request
        </label>
        <div className="flex items-center gap-1.5 w-full">
          <span className="font-[family-name:var(--font-manrope)] font-bold text-2xl sm:text-3xl text-indigo-600 leading-none">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amountDisplay}
            onChange={(e) => handleAmountChange(e.target.value)}
            aria-label="Amount in dollars"
            aria-invalid={!!fieldErrors.amountCents}
            className={cn(
              'w-full bg-transparent border-none p-0 font-[family-name:var(--font-manrope)] font-bold text-2xl sm:text-3xl leading-none text-foreground focus:ring-0 focus:outline-none placeholder:text-outline-variant',
              fieldErrors.amountCents && 'text-rose-600',
            )}
          />
        </div>
        {fieldErrors.amountCents && (
          <p className="text-sm text-rose-600" role="alert">
            {fieldErrors.amountCents}
          </p>
        )}
      </div>

      {/* Form Fields */}
      <div className="bg-surface-container-low p-6 sm:p-8 rounded-[2rem] space-y-6">
        {/* Recipient Type Toggle */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 pb-1 block">
            Send request to
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRecipientType('email');
                setRecipientValue('');
                setFieldErrors((p) => {
                  const n = { ...p };
                  delete n.recipientValue;
                  return n;
                });
              }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                recipientType === 'email'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setRecipientType('phone');
                setRecipientValue('');
                setFieldErrors((p) => {
                  const n = { ...p };
                  delete n.recipientValue;
                  return n;
                });
              }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                recipientType === 'phone'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              Phone
            </button>
          </div>
        </div>

        {/* Recipient Input */}
        <Input
          label="Recipient details"
          name="recipientValue"
          type={recipientType === 'email' ? 'email' : 'tel'}
          placeholder={recipientType === 'email' ? 'recipient@example.com' : '+15551234567'}
          value={recipientValue}
          onChange={(e) => {
            setRecipientValue(e.target.value);
            setFieldErrors((p) => {
              const n = { ...p };
              delete n.recipientValue;
              return n;
            });
          }}
          error={fieldErrors.recipientValue}
        />

        {/* Note */}
        <div className="space-y-2">
          <label
            htmlFor="request-note"
            className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Purpose (optional)
          </label>
          <textarea
            id="request-note"
            placeholder="Add a short note for the request..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX_LENGTH}
            rows={3}
            className="w-full p-4 bg-white rounded-2xl border-none text-slate-900 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none"
          />
          <p className="text-xs text-slate-400 text-right">
            {note.length}/{NOTE_MAX_LENGTH}
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        loading={isPending}
        onClick={handleSubmit}
        className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-indigo-600/20"
      >
        Request Funds
      </Button>
    </div>
  );
}
