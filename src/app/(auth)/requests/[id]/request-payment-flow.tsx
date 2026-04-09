'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorMessage } from '@/components/ui/error-message';
import { FundingSourceSelector } from '@/components/payment/funding-source-selector';
import { PaymentConfirmation } from '@/components/payment/payment-confirmation';
import { payRequest } from '@/lib/actions/payment-actions';
import { formatCents } from '@/lib/utils';
import type { PaymentRequestViewRow, WalletRow, BankAccountRow } from '@/lib/types/database';
import type { FundingSourceType } from '@/lib/types/domain';

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'pending' | 'paid' | 'declined' | 'canceled' | 'expired' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  paid: { label: 'Paid', variant: 'paid' },
  declined: { label: 'Declined', variant: 'declined' },
  canceled: { label: 'Canceled', variant: 'canceled' },
  expired: { label: 'Expired', variant: 'expired' },
};

interface RequestPaymentFlowProps {
  request: PaymentRequestViewRow;
  requesterName: string;
  isRequester: boolean;
  isRecipient: boolean;
  wallet: WalletRow | null;
  bankAccount: BankAccountRow | null;
}

export function RequestPaymentFlow({
  request,
  requesterName,
  isRequester,
  isRecipient,
  wallet,
  bankAccount,
}: RequestPaymentFlowProps) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<FundingSourceType | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const statusInfo = STATUS_BADGE_MAP[request.effective_status] ?? {
    label: request.effective_status,
    variant: 'default' as const,
  };

  const isPendingRequest = request.effective_status === 'pending';

  function handlePay() {
    if (!selectedSource) return;
    setError(null);

    startTransition(async () => {
      const result = await payRequest({
        requestId: request.id,
        fundingSource: selectedSource,
      });

      if (result.success) {
        setPaid(true);
        setShowConfirm(false);
      } else {
        setShowConfirm(false);
        setError(result.error.message);
      }
    });
  }

  if (paid) {
    return (
      <div className="flex flex-col items-center gap-8 pt-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-slate-900">
            Payment Successful!
          </h1>
          <p className="text-slate-500">
            You paid {formatCents(request.amount_cents)} to {requesterName}.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const fundingSourceLabel =
    selectedSource === 'wallet'
      ? 'Wallet'
      : bankAccount
        ? `${bankAccount.bank_name} ${bankAccount.account_number_masked}`
        : 'Bank Account';

  return (
    <>
      <Card>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Payment Request</p>
              <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-slate-900">
                {formatCents(request.amount_cents)}
              </h1>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">From</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{requesterName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">To</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{request.recipient_value}</dd>
            </div>
            {request.note && (
              <div className="col-span-2">
                <dt className="text-slate-500">Note</dt>
                <dd className="mt-0.5 text-slate-900">{request.note}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="mt-0.5 text-slate-900">
                {new Date(request.created_at).toLocaleDateString()}
              </dd>
            </div>
            {isPendingRequest && (
              <div>
                <dt className="text-slate-500">Expires</dt>
                <dd className="mt-0.5 text-slate-900">
                  {new Date(request.expires_at).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </Card>

      {isRecipient && isPendingRequest && wallet && (
        <Card>
          <div className="space-y-6">
            <FundingSourceSelector
              walletBalanceCents={wallet.balance_cents}
              bankAccount={
                bankAccount
                  ? {
                      id: bankAccount.id,
                      bankName: bankAccount.bank_name,
                      accountNumberMasked: bankAccount.account_number_masked,
                      balanceCents: bankAccount.balance_cents,
                    }
                  : null
              }
              amountCents={request.amount_cents}
              selected={selectedSource}
              onSelect={setSelectedSource}
            />

            {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!selectedSource}
              onClick={() => setShowConfirm(true)}
            >
              Pay {formatCents(request.amount_cents)}
            </Button>
          </div>
        </Card>
      )}

      {isRequester && isPendingRequest && (
        <Card>
          <p className="text-center text-sm text-slate-500">
            Waiting for the recipient to respond to your request.
          </p>
        </Card>
      )}

      {!isPendingRequest && (
        <Card>
          <p className="text-center text-sm text-slate-500">
            This request has been {request.effective_status}. No further actions are available.
          </p>
        </Card>
      )}

      <PaymentConfirmation
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handlePay}
        loading={isPending}
        amountCents={request.amount_cents}
        fundingSource={selectedSource ?? 'wallet'}
        fundingSourceLabel={fundingSourceLabel}
        recipientName={requesterName}
      />
    </>
  );
}
