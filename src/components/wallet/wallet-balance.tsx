'use client';

import { Card } from '@/components/ui/card';
import { formatMinor } from '@/lib/utils';
import type { WalletRow } from '@/lib/types/database';

function WalletIcon() {
  return (
    <svg
      className="h-10 w-10 text-indigo-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function WalletBalance({ wallet }: { wallet: WalletRow }) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
          <WalletIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Wallet Balance
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {formatMinor(wallet.balance_minor, wallet.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Updated {formatRelativeTime(wallet.updated_at)}
          </p>
        </div>
      </div>
    </Card>
  );
}
