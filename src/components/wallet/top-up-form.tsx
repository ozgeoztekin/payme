'use client';

import { useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { topUpWallet } from '@/lib/actions/wallet-actions';
import { formatCents } from '@/lib/utils';
import type { BankAccountRow } from '@/lib/types/database';

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

export function TopUpForm({
  bankAccount,
  onSuccess,
}: {
  bankAccount: BankAccountRow;
  onSuccess?: (data: { walletBalance: number; bankBalance: number }) => void;
}) {
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAmountChange(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const formatted = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned;
    setAmountStr(formatted);
    setError(null);
    setSuccessMsg(null);
  }

  function setQuickAmount(cents: number) {
    setAmountStr((cents / 100).toFixed(2));
    setError(null);
    setSuccessMsg(null);
  }

  function handleSubmit() {
    setError(null);
    setSuccessMsg(null);

    const dollars = parseFloat(amountStr);
    if (isNaN(dollars) || dollars <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amountCents = Math.round(dollars * 100);

    if (amountCents < 1) {
      setError('Minimum top-up is $0.01');
      return;
    }

    if (amountCents > bankAccount.balance_cents) {
      setError('Amount exceeds your bank account balance');
      return;
    }

    startTransition(async () => {
      const result = await topUpWallet({ amountCents });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSuccessMsg(`${formatCents(amountCents)} added to your wallet`);
      setAmountStr('');
      onSuccess?.({
        walletBalance: result.data.walletBalance,
        bankBalance: result.data.bankBalance,
      });
    });
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Top Up Wallet</h3>
      <p className="mt-1 text-sm text-slate-500">
        Transfer funds from <strong>{bankAccount.bank_name}</strong>{' '}
        ({bankAccount.account_number_masked}) to your wallet.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => setQuickAmount(cents)}
            disabled={isPending || cents > bankAccount.balance_cents}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {formatCents(cents)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Input
          label="Amount"
          name="topUpAmount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => handleAmountChange(e.target.value)}
          disabled={isPending}
          helpText={`Available: ${formatCents(bankAccount.balance_cents)}`}
        />
      </div>

      {error && <ErrorMessage message={error} className="mt-3" />}

      {successMsg && (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600" role="status">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="mt-5">
        <Button
          onClick={handleSubmit}
          loading={isPending}
          disabled={!amountStr || isPending}
          className="w-full"
        >
          Top Up Wallet
        </Button>
      </div>
    </Card>
  );
}
