'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ErrorMessage } from '@/components/ui/error-message';
import { formatCents, BANK_OPTIONS } from '@/lib/utils';

type Step = 'actions' | 'bank-select' | 'bank-confirm' | 'pay-confirm' | 'success' | 'declined';

interface GuestBankData {
  guestBankId: string;
  bankName: string;
  accountNumberMasked: string;
  balanceCents: number;
}

interface GuestPaymentFlowProps {
  shareToken: string;
  amountCents: number;
  requesterName: string;
}

export function GuestPaymentFlow({
  shareToken,
  amountCents,
  requesterName,
}: GuestPaymentFlowProps) {
  const [step, setStep] = useState<Step>('actions');
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [guestBank, setGuestBank] = useState<GuestBankData | null>(null);

  function handleBankSelectNext() {
    const errors: Record<string, string> = {};
    if (!bankName) errors.bankName = 'Please select a bank';
    if (!/^\d{4}$/.test(last4)) errors.accountNumberLast4 = 'Must be exactly 4 digits';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setStep('bank-confirm');
  }

  async function handleBankConfirm() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/bank-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, accountNumberLast4: last4 }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error?.message ?? 'Failed to connect bank account');
        setStep('bank-select');
        return;
      }

      setGuestBank(result.data);
      setStep('pay-confirm');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setStep('bank-select');
    } finally {
      setLoading(false);
    }
  }

  async function handlePayConfirm() {
    if (!guestBank) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/pay-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken, guestBankId: guestBank.guestBankId }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error?.message ?? 'Payment failed');
        return;
      }

      setStep('success');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/decline-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error?.message ?? 'Failed to decline request');
        return;
      }

      setStep('declined');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">Payment Successful</p>
            <p className="mt-2 text-sm text-slate-500">
              You paid {formatCents(amountCents)} to {requesterName}.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (step === 'declined') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-7 w-7 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">Request Declined</p>
            <p className="mt-2 text-sm text-slate-500">
              You have declined the payment request from {requesterName}.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (step === 'pay-confirm' && guestBank) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Confirm Payment</h3>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-semibold text-slate-900">{formatCents(amountCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">To</dt>
                <dd className="font-medium text-slate-900">{requesterName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">From</dt>
                <dd className="font-medium text-slate-900">
                  {guestBank.bankName} ({guestBank.accountNumberMasked})
                </dd>
              </div>
            </dl>
          </div>
          <p className="text-center text-xs text-slate-500">
            This action cannot be undone. The funds will be transferred immediately.
          </p>
        </div>
        {error && <ErrorMessage message={error} className="mt-4" />}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setStep('bank-select');
              setGuestBank(null);
              setError(null);
            }}
            disabled={loading}
          >
            Back
          </Button>
          <Button className="flex-1" onClick={handlePayConfirm} loading={loading}>
            Pay {formatCents(amountCents)}
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'bank-confirm') {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Confirm Bank Connection</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Bank</span>
            <span className="font-medium text-slate-900">{bankName}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Account</span>
            <span className="font-medium text-slate-900">••••{last4}</span>
          </div>
          <p className="text-xs text-slate-400">
            This is a simulated connection. A mocked balance of $10,000.00 will be assigned.
          </p>
        </div>
        {error && <ErrorMessage message={error} className="mt-4" />}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setStep('bank-select')}
            disabled={loading}
          >
            Back
          </Button>
          <Button className="flex-1" onClick={handleBankConfirm} loading={loading}>
            Connect &amp; Continue
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'bank-select') {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Connect a Bank Account</h3>
        <p className="mt-1 text-sm text-slate-500">
          Connect a bank account to pay {formatCents(amountCents)} to {requesterName}.
        </p>
        <div className="mt-6 space-y-4">
          <Select
            label="Bank"
            name="bankName"
            options={BANK_OPTIONS}
            value={bankName}
            onChange={(e) => {
              setBankName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, bankName: '' }));
            }}
            error={fieldErrors.bankName}
          />
          <Input
            label="Last 4 digits of account number"
            name="accountNumberLast4"
            placeholder="1234"
            maxLength={4}
            inputMode="numeric"
            pattern="\d{4}"
            value={last4}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setLast4(val);
              setFieldErrors((prev) => ({ ...prev, accountNumberLast4: '' }));
            }}
            error={fieldErrors.accountNumberLast4}
            helpText="Enter the last 4 digits for display purposes"
          />
        </div>
        {error && <ErrorMessage message={error} className="mt-4" />}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setStep('actions');
              setBankName('');
              setLast4('');
              setFieldErrors({});
              setError(null);
            }}
          >
            Back
          </Button>
          <Button onClick={handleBankSelectNext} className="flex-1">
            Continue
          </Button>
        </div>
      </Card>
    );
  }

  // Default: actions step with Pay and Decline buttons
  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Respond to This Request</h3>
      <p className="mt-1 text-sm text-slate-500">
        {requesterName} is requesting {formatCents(amountCents)} from you.
      </p>
      {error && <ErrorMessage message={error} className="mt-4" />}
      <div className="mt-6 flex gap-3">
        <Button variant="danger" className="flex-1" onClick={handleDecline} loading={loading}>
          Decline
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            setError(null);
            setStep('bank-select');
          }}
          disabled={loading}
        >
          Pay {formatCents(amountCents)}
        </Button>
      </div>
    </Card>
  );
}
