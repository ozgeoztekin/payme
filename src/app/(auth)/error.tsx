'use client';

import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/page-layout';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer centered className="justify-center px-4 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
        <svg
          className="h-8 w-8 text-rose-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Something went wrong
        </h1>
        <p className="text-on-surface-variant">
          An unexpected error occurred. Please try again or return to the dashboard.
        </p>
        {error.digest && <p className="text-xs text-outline">Error ID: {error.digest}</p>}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={reset}>
          Try Again
        </Button>
        <Button onClick={() => (window.location.href = '/dashboard')}>Go to Dashboard</Button>
      </div>
    </PageContainer>
  );
}
