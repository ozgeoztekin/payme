import Link from 'next/link';
import { formatCents } from '@/lib/utils';
import type { PaymentRequestListItem, RequestListTab } from '@/lib/types/api';
import { RequestStatusBadge } from './request-status-badge';
import { ExpirationCountdown } from './expiration-countdown';

function counterpartyLabel(item: PaymentRequestListItem, tab: RequestListTab): string {
  if (tab === 'incoming') {
    return item.requester_display_name;
  }
  return item.recipient_value;
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  if (label.length >= 2) {
    return label.slice(0, 2).toUpperCase();
  }
  return label.slice(0, 1).toUpperCase() || '?';
}

function formatCardDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function RequestCard({ item, tab }: { item: PaymentRequestListItem; tab: RequestListTab }) {
  const title = counterpartyLabel(item, tab);
  const subtitleParts = [item.note?.trim() || null, formatCardDate(item.created_at)].filter(
    Boolean,
  );
  const subtitle = subtitleParts.join(' · ');

  return (
    <Link
      href={`/requests/${item.id}`}
      className="flex items-center justify-between gap-4 bg-white p-4 transition-colors hover:bg-surface-container-low md:p-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 md:h-12 md:w-12 md:text-sm"
          aria-hidden
        >
          {initials(title)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--font-manrope)] text-sm font-bold text-foreground md:text-base">
            {title}
          </p>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p> : null}
          <div className="mt-1 md:hidden">
            <ExpirationCountdown
              expiresAt={item.expires_at}
              effectiveStatus={item.effective_status}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 md:gap-8">
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="font-[family-name:var(--font-manrope)] text-sm font-bold text-foreground md:text-lg">
            {formatCents(item.amount_cents)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge effectiveStatus={item.effective_status} />
            <span className="hidden md:inline">
              <ExpirationCountdown
                expiresAt={item.expires_at}
                effectiveStatus={item.effective_status}
              />
            </span>
          </div>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-surface-container-high hover:text-slate-600 md:h-10 md:w-10">
          <svg
            className="h-4 w-4 md:h-5 md:w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="sr-only">View request</span>
        </span>
      </div>
    </Link>
  );
}
