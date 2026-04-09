'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequestForm } from '@/components/requests/request-form';
import { ShareableLink } from '@/components/requests/shareable-link';
import { Button } from '@/components/ui/button';
import { createRequest } from '@/lib/actions/request-actions';
import { formatCents } from '@/lib/utils';
import type { CreateRequestInput } from '@/lib/types/api';

interface SuccessData {
  shareUrl: string;
  amountCents: number;
  recipientValue: string;
}

export default function NewRequestPage() {
  const router = useRouter();
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  async function handleSubmit(input: CreateRequestInput) {
    const result = await createRequest(input);
    if (result.success) {
      setSuccessData({
        shareUrl: result.data.shareUrl,
        amountCents: result.data.request.amount_cents,
        recipientValue: result.data.request.recipient_value,
      });
    }
    return result;
  }

  if (successData) {
    return (
      <div className="flex flex-col items-center gap-12 pt-8 sm:pt-12">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Success checkmark */}
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] font-bold text-2xl sm:text-3xl text-slate-900">
              Request Sent!
            </h1>
            <p className="text-slate-500 max-w-sm">
              We&apos;ve created your request for{' '}
              <strong className="text-slate-900">{formatCents(successData.amountCents)}</strong> to{' '}
              <strong className="text-slate-900">{successData.recipientValue}</strong>.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <ShareableLink url={successData.shareUrl} />
        </div>

        <div className="w-full max-w-md space-y-3">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => setSuccessData(null)}
          >
            Create Another Request
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 sm:gap-12 pt-4 sm:pt-8">
      <div className="text-center space-y-2">
        <h1 className="font-[family-name:var(--font-manrope)] font-bold text-2xl sm:text-3xl tracking-tight text-slate-900">
          Request Funds
        </h1>
        <p className="text-slate-500 text-base sm:text-lg">
          Send a secure payment request to anyone instantly.
        </p>
      </div>
      <RequestForm onSubmit={handleSubmit} />
    </div>
  );
}
