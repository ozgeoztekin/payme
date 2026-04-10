'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ErrorMessage } from '@/components/ui/error-message';
import { FundingSourceSelector } from '@/components/payment/funding-source-selector';
import { PaymentConfirmation } from '@/components/payment/payment-confirmation';
import { RequestDetail } from '@/components/requests/request-detail';
import { ShareableLink } from '@/components/requests/shareable-link';
import { payRequest } from '@/lib/actions/payment-actions';
import { declineRequest, cancelRequest } from '@/lib/actions/request-actions';
import { formatCents } from '@/lib/utils';
import type { PaymentRequestViewRow, WalletRow, BankAccountRow } from '@/lib/types/database';
import type { FundingSourceType } from '@/lib/types/domain';

interface RequestPaymentFlowProps {
  request: PaymentRequestViewRow;
  requesterName: string;
  isRequester: boolean;
  isRecipient: boolean;
  wallet: WalletRow | null;
  bankAccount: BankAccountRow | null;
  shareUrl: string;
}

export function RequestPaymentFlow({
  request,
  requesterName,
  isRequester,
  isRecipient,
  wallet,
  bankAccount,
  shareUrl,
}: RequestPaymentFlowProps) {
  const router = useRouter();

  const [selectedSource, setSelectedSource] = useState<FundingSourceType | null>(null);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [isPayPending, startPayTransition] = useTransition();
  const [isDeclinePending, startDeclineTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [canceled, setCanceled] = useState(false);

  const isPendingRequest = request.effective_status === 'pending';
  const isTerminal = !isPendingRequest;

  function handlePay() {
    if (!selectedSource) return;
    setError(null);

    startPayTransition(async () => {
      const result = await payRequest({
        requestId: request.id,
        fundingSource: selectedSource,
      });

      if (result.success) {
        setPaid(true);
        setShowPayConfirm(false);
      } else {
        setShowPayConfirm(false);
        setError(result.error.message);
      }
    });
  }

  function handleDecline() {
    setError(null);
    startDeclineTransition(async () => {
      const result = await declineRequest(request.id);
      if (result.success) {
        setDeclined(true);
        setShowDeclineConfirm(false);
      } else {
        setShowDeclineConfirm(false);
        setError(result.error.message);
      }
    });
  }

  function handleCancel() {
    setError(null);
    startCancelTransition(async () => {
      const result = await cancelRequest(request.id);
      if (result.success) {
        setCanceled(true);
        setShowCancelConfirm(false);
      } else {
        setShowCancelConfirm(false);
        setError(result.error.message);
      }
    });
  }

  if (paid) {
    return (
      <div className="flex flex-col items-center gap-8 pt-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg
            className="h-10 w-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
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

  if (declined) {
    return (
      <div className="flex flex-col items-center gap-8 pt-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <svg
            className="h-10 w-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-slate-900">
            Request Declined
          </h1>
          <p className="text-slate-500">
            You declined the {formatCents(request.amount_cents)} request from {requesterName}.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="flex flex-col items-center gap-8 pt-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <svg
            className="h-10 w-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-slate-900">
            Request Canceled
          </h1>
          <p className="text-slate-500">
            Your {formatCents(request.amount_cents)} request has been canceled.
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
      <RequestDetail
        request={request}
        requesterName={requesterName}
        readOnly={isTerminal}
      />

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      {isRequester && isPendingRequest && (
        <Card>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Share this link with the recipient so they can pay your request.
            </p>
            <ShareableLink url={shareUrl} />
            <div className="pt-2 border-t border-slate-100">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                disabled={isCancelPending}
              >
                Cancel Request
              </Button>
            </div>
          </div>
        </Card>
      )}

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

            <div className="flex gap-3">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={!selectedSource}
                onClick={() => setShowPayConfirm(true)}
              >
                Pay {formatCents(request.amount_cents)}
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => setShowDeclineConfirm(true)}
                disabled={isDeclinePending}
              >
                Decline
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isRecipient && isPendingRequest && !wallet && (
        <Card>
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-500">
              Your wallet is not set up yet. Please contact support.
            </p>
            <div className="flex justify-center">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeclineConfirm(true)}
                disabled={isDeclinePending}
              >
                Decline Request
              </Button>
            </div>
          </div>
        </Card>
      )}

      <PaymentConfirmation
        open={showPayConfirm}
        onClose={() => setShowPayConfirm(false)}
        onConfirm={handlePay}
        loading={isPayPending}
        amountCents={request.amount_cents}
        fundingSource={selectedSource ?? 'wallet'}
        fundingSourceLabel={fundingSourceLabel}
        recipientName={requesterName}
      />

      <Modal
        open={showDeclineConfirm}
        onClose={() => setShowDeclineConfirm(false)}
        title="Decline Request"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowDeclineConfirm(false)}
              disabled={isDeclinePending}
            >
              Keep
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDecline}
              loading={isDeclinePending}
            >
              Decline
            </Button>
          </div>
        }
      >
        <p>
          Are you sure you want to decline this {formatCents(request.amount_cents)} request from{' '}
          <span className="font-medium text-slate-900">{requesterName}</span>? This cannot be
          undone.
        </p>
      </Modal>

      <Modal
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Request"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCancelConfirm(false)}
              disabled={isCancelPending}
            >
              Keep
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleCancel}
              loading={isCancelPending}
            >
              Cancel Request
            </Button>
          </div>
        }
      >
        <p>
          Are you sure you want to cancel your {formatCents(request.amount_cents)} request? This
          cannot be undone.
        </p>
      </Modal>
    </>
  );
}
