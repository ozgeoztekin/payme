'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorMessage({
  message,
  onDismiss,
  variant = 'inline',
  durationMs = 5000,
  className,
}: {
  message: string;
  onDismiss?: () => void;
  variant?: 'inline' | 'toast';
  durationMs?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    setVisible(true);
  }, [message]);

  useEffect(() => {
    if (variant !== 'toast' || durationMs <= 0) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      onDismissRef.current?.();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [variant, durationMs, message]);

  if (!visible) return null;

  if (variant === 'toast') {
    return (
      <div
        role="alert"
        className={cn(
          'fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-rose-700 shadow-lg ring-1 ring-slate-200/80',
          className,
        )}
      >
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <p className="min-w-0 flex-1 pt-0.5">{message}</p>
        {onDismiss ? (
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            className="shrink-0 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div role="alert" className={cn('flex items-start gap-2 text-sm text-rose-600', className)}>
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto shrink-0 rounded-full p-0.5 text-rose-500 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
