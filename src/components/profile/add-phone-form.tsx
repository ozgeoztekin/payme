'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addPhoneNumber } from '@/lib/actions/profile-actions';

export function AddPhoneForm() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccessMsg(null);

    const trimmed = phone.trim();
    if (!trimmed) {
      setError('Please enter a phone number.');
      return;
    }

    startTransition(async () => {
      const result = await addPhoneNumber({ phone: trimmed });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSuccessMsg(`Phone number ${result.data.phone} added successfully.`);
      setPhone('');
    });
  }

  if (successMsg) {
    return (
      <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-6">
        <div className="flex items-center gap-2 text-emerald-700" role="status">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-100 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Add Phone Number</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add a phone number to make your account discoverable for payment requests.
        </p>
      </div>

      <Input
        label="Phone Number"
        name="phone"
        type="tel"
        placeholder="+15551234567"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setError(null);
        }}
        disabled={isPending}
        error={error ?? undefined}
        helpText="E.164 format required (e.g., +15551234567)"
      />

      <Button
        onClick={handleSubmit}
        loading={isPending}
        disabled={!phone.trim() || isPending}
        className="w-full"
      >
        Save Phone Number
      </Button>
    </section>
  );
}
