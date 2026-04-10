'use client';

import { Button } from '@/components/ui/button';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
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
      <h1 className="mt-6 text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">
        An unexpected error occurred. Please try again or return to the dashboard.
      </p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Error ID: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={reset}>
          Try Again
        </Button>
        <Button onClick={() => (window.location.href = '/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  );
}
