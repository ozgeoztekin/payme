'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ErrorMessage } from '@/components/ui/error-message';
import { connectBankAccount } from '@/lib/actions/bank-actions';
import type { BankAccountRow } from '@/lib/types/database';

const BANK_OPTIONS = [
  { value: '', label: 'Select a bank' },
  { value: 'Chase', label: 'Chase' },
  { value: 'Bank of America', label: 'Bank of America' },
  { value: 'Wells Fargo', label: 'Wells Fargo' },
  { value: 'Citi', label: 'Citi' },
  { value: 'Capital One', label: 'Capital One' },
  { value: 'US Bank', label: 'US Bank' },
];

type Step = 'select' | 'confirm' | 'success';

export function BankConnectFlow({
  onConnected,
}: {
  onConnected?: (bank: BankAccountRow) => void;
}) {
  const [step, setStep] = useState<Step>('select');
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSelectNext() {
    const errors: Record<string, string> = {};
    if (!bankName) errors.bankName = 'Please select a bank';
    if (!/^\d{4}$/.test(last4)) errors.accountNumberLast4 = 'Must be exactly 4 digits';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setStep('confirm');
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await connectBankAccount({
        bankName,
        accountNumberLast4: last4,
      });

      if (!result.success) {
        setError(result.error.message);
        setStep('select');
        return;
      }

      setStep('success');
      onConnected?.(result.data.bankAccount);
    });
  }

  if (step === 'success') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" aria-hidden>
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
            <p className="text-lg font-semibold text-slate-900">Bank Connected</p>
            <p className="mt-1 text-sm text-slate-500">
              {bankName} (••••{last4}) is now linked to your account.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setStep('select');
              setBankName('');
              setLast4('');
            }}
          >
            Connect a different bank
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'confirm') {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Confirm Connection</h3>
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
            onClick={() => setStep('select')}
            disabled={isPending}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            loading={isPending}
          >
            Connect Bank
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Connect a Bank Account</h3>
      <p className="mt-1 text-sm text-slate-500">
        Link a bank account to fund payments and top up your wallet.
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
      <div className="mt-6">
        <Button onClick={handleSelectNext} className="w-full">
          Continue
        </Button>
      </div>
    </Card>
  );
}
