import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const variantClasses = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-slate-100 text-slate-600',
  canceled: 'bg-slate-100 text-slate-600',
  expired: 'bg-red-100 text-red-800',
  success: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-indigo-100 text-indigo-800',
} as const;

export function Badge({
  variant,
  children,
  className,
}: {
  variant: 'pending' | 'paid' | 'declined' | 'canceled' | 'expired' | 'success' | 'error' | 'info';
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
