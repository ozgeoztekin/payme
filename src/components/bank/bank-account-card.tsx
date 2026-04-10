'use client';

import { useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatCents } from '@/lib/utils';
import { disconnectBankAccount } from '@/lib/actions/bank-actions';
import type { BankAccountRow } from '@/lib/types/database';

function BankIcon() {
  return (
    <svg
      className="h-10 w-10 text-indigo-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M12 3l9 7H3l9-7z" />
      <path d="M5 10v8" />
      <path d="M9.5 10v8" />
      <path d="M14.5 10v8" />
      <path d="M19 10v8" />
    </svg>
  );
}

export function BankAccountCard({
  bankAccount,
  onDisconnected,
}: {
  bankAccount: BankAccountRow;
  onDisconnected?: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectBankAccount();
      if (result.success) {
        setShowConfirm(false);
        onDisconnected?.();
      }
    });
  }

  return (
    <>
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
            <BankIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-900">{bankAccount.bank_name}</p>
            <p className="text-sm text-slate-500">{bankAccount.account_number_masked}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Available Balance
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCents(bankAccount.balance_cents)}
          </p>
        </div>
        <div className="mt-4">
          <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
            Disconnect
          </Button>
        </div>
      </Card>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Disconnect Bank Account?"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDisconnect}
              loading={isPending}
            >
              Disconnect
            </Button>
          </div>
        }
      >
        <p>
          Are you sure you want to disconnect <strong>{bankAccount.bank_name}</strong> (
          {bankAccount.account_number_masked})? You can always reconnect later.
        </p>
      </Modal>
    </>
  );
}
