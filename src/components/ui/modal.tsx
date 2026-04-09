'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [renderOpen, setRenderOpen] = useState(open);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (open) {
      setRenderOpen(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open && renderOpen) {
      const t = window.setTimeout(() => setRenderOpen(false), 200);
      return () => window.clearTimeout(t);
    }
  }, [open, renderOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!mounted || !renderOpen) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        !open && 'pointer-events-none',
      )}
      role="presentation"
    >
      <div
        className={cn(
          'absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
        onClick={handleBackdropClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition-opacity duration-200 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4 text-slate-600">{children}</div>
        {footer != null ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
