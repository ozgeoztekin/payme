'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils';
import type { FundingSourceType } from '@/lib/types/domain';

interface PaymentConfirmationProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  amountCents: number;
  fundingSource: FundingSourceType;
  fundingSourceLabel: string;
  recipientName: string;
}

export function PaymentConfirmation({
  open,
  onClose,
  onConfirm,
  loading,
  amountCents,
  fundingSource,
  fundingSourceLabel,
  recipientName,
}: PaymentConfirmationProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title="Confirm Payment"
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            Pay {formatCents(amountCents)}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-semibold text-slate-900">{formatCents(amountCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">To</dt>
              <dd className="font-medium text-slate-900">{recipientName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">From</dt>
              <dd className="font-medium text-slate-900">
                {fundingSource === 'wallet' ? 'Wallet' : fundingSourceLabel}
              </dd>
            </div>
          </dl>
        </div>
        <p className="text-center text-xs text-slate-500">
          This action cannot be undone. The funds will be transferred immediately.
        </p>
      </div>
    </Modal>
  );
}
