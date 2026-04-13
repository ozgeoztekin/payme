'use client';

import { useRef, useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { MoneyInput } from '@/components/ui/money-input';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { topUpWallet } from '@/lib/actions/wallet-actions';
import { formatMinor } from '@/lib/utils';
import { formatUsdBlur } from '@/lib/money';
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
  const amountMinorRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setQuickAmount(cents: number) {
    const display = formatUsdBlur((cents / 100).toFixed(2));
    setAmountStr(display);
    amountMinorRef.current = cents;
    setError(null);
    setSuccessMsg(null);
  }

  function handleSubmit() {
    setError(null);
    setSuccessMsg(null);

    const amountMinor = amountMinorRef.current;

    if (amountMinor < 1) {
      setError('Please enter a valid amount (minimum $0.01)');
      return;
    }

    if (amountMinor > bankAccount.balance_minor) {
      setError('Amount exceeds your bank account balance');
      return;
    }

    startTransition(async () => {
      const result = await topUpWallet({ amountMinor });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSuccessMsg(`${formatMinor(amountMinor)} added to your wallet`);
      setAmountStr('');
      onSuccess?.({
        walletBalance: result.data.walletBalance,
        bankBalance: result.data.bankBalance,
      });
    });
  }

  return (
    <Card>
      <p className="text-sm text-slate-500">
        Transfer funds from <strong>{bankAccount.bank_name}</strong> (
        {bankAccount.account_number_masked}) to your wallet.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => setQuickAmount(cents)}
            disabled={isPending || cents > bankAccount.balance_minor}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {formatMinor(cents)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <MoneyInput
          variant="field"
          label="Amount"
          name="topUpAmount"
          value={amountStr}
          onValueChange={(v) => {
            setAmountStr(v);
            setError(null);
            setSuccessMsg(null);
          }}
          onMinorChange={(cents) => {
            amountMinorRef.current = cents;
          }}
          disabled={isPending}
          helpText={`Available: ${formatMinor(bankAccount.balance_minor, bankAccount.currency)}`}
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
