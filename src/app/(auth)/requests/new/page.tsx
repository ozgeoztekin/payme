'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequestForm } from '@/components/requests/request-form';
import { ShareableLink } from '@/components/requests/shareable-link';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/layout/page-layout';
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
      <PageContainer>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 shrink-0 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8"
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
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Request Sent!
            </h1>
            <p className="text-on-surface-variant">
              We&apos;ve created your request for{' '}
              <strong className="text-foreground">{formatCents(successData.amountCents)}</strong> to{' '}
              <strong className="text-foreground">{successData.recipientValue}</strong>.
            </p>
          </div>
        </div>

        <ShareableLink url={successData.shareUrl} />

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" onClick={() => setSuccessData(null)}>
            Create Another Request
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Request Funds"
        subtitle="Send a secure payment request to anyone instantly."
      />
      <RequestForm onSubmit={handleSubmit} />
    </PageContainer>
  );
}
