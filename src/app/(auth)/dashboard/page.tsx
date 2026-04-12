'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRequests, type RequestStatusFilterChoice } from '@/hooks/use-requests';
import { useWallet } from '@/hooks/use-wallet';
import type { RequestListTab } from '@/lib/types/api';
import { RequestList } from '@/components/requests/request-list';
import { ErrorMessage } from '@/components/ui/error-message';
import { PageContainer, SectionTitle } from '@/components/layout/page-layout';
import { cn, formatCents, getEmptyStateTitle } from '@/lib/utils';

const STATUS_FILTERS: { value: RequestStatusFilterChoice; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'declined', label: 'Declined' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'expired', label: 'Expired' },
];

function WalletIcon() {
  return (
    <svg
      className="h-6 w-6 text-indigo-600"
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

function BankIcon() {
  return (
    <svg
      className="h-6 w-6 text-indigo-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M12 3l9 7H3l9-7z" />
      <path d="M5 10v8" />
      <path d="M9.5 10v8" />
      <path d="M14.5 10v8" />
      <path d="M19 10v8" />
    </svg>
  );
}

function BalanceHeroSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 lg:flex-row lg:items-center">
      <div className="flex-1">
        <div className="h-3 w-36 rounded bg-surface-container" />
        <div className="mt-3 h-12 w-56 rounded-lg bg-surface-container-high" />
      </div>
      <div className="w-full lg:w-72">
        <div className="h-20 rounded-2xl bg-surface-container-low ring-1 ring-outline-variant/15" />
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-white shadow-sm">
      <div className="flex flex-col divide-y divide-outline-variant/10">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex animate-pulse flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-surface-container-high" />
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-surface-container-high" />
                <div className="h-3 w-56 rounded bg-surface-container" />
              </div>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <div className="h-5 w-24 rounded bg-surface-container-high" />
              <div className="h-5 w-20 rounded-full bg-surface-container" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<RequestListTab>('incoming');
  const [status, setStatus] = useState<RequestStatusFilterChoice>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { requests, total, limit, loading, error, pending_action_count, debouncedSearch } =
    useRequests({ tab, status, search, page });
  const { wallet, bankAccount, loading: walletLoading } = useWallet();

  useEffect(() => {
    setPage(1);
  }, [tab, status, debouncedSearch]);

  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  const emptyCopy = {
    title: getEmptyStateTitle(tab, status),
    description:
      tab === 'incoming'
        ? 'When someone sends you a payment request, it will show up here. You can also create your own request to get paid.'
        : 'Requests you create appear here. Start by sending your first payment request.',
  };

  return (
    <PageContainer size="lg">
      {walletLoading ? (
        <BalanceHeroSkeleton />
      ) : wallet ? (
        <section
          className="flex flex-col gap-6 lg:flex-row lg:items-center"
          aria-label="Account summary"
        >
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3 md:block">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Total Available Balance
                </p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tighter text-indigo-700 sm:text-4xl">
                  {formatCents(wallet.balance_cents)}
                </p>
              </div>
              <Link
                href="/requests/new"
                className="flex shrink-0 items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800 md:hidden"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Request
              </Link>
            </div>
          </div>

          {bankAccount ? (
            <Link href="/wallet" className="block w-full transition-all hover:opacity-90 lg:w-72">
              <div className="flex items-center gap-4 rounded-2xl bg-surface-container-low p-5 shadow-sm ring-1 ring-outline-variant/15 transition-colors hover:bg-surface-container-lowest">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                  <BankIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                    Primary Bank
                  </p>
                  <p className="truncate font-semibold text-on-surface">{bankAccount.bank_name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase text-emerald-600">
                      Connected
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/wallet" className="block w-full transition-all hover:opacity-90 lg:w-72">
              <div className="flex items-center gap-4 rounded-2xl bg-surface-container-low p-5 shadow-sm ring-1 ring-outline-variant/15 transition-colors hover:bg-surface-container-lowest">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <WalletIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                    Bank Account
                  </p>
                  <p className="text-sm font-medium text-indigo-600">Connect a bank &rarr;</p>
                </div>
              </div>
            </Link>
          )}
        </section>
      ) : null}

      <div className="rounded-2xl bg-surface-container-low p-6 shadow-sm ring-1 ring-outline-variant/15">
        <div className="flex flex-col gap-6">
          <div className="relative w-full md:max-w-md">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sender, recipient, or note"
              className="w-full rounded-full border-0 bg-white py-3 pl-12 pr-4 text-sm text-foreground shadow-sm ring-1 ring-outline-variant/20 transition-[box-shadow] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/25"
              aria-label="Search requests"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:pb-0 [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Request direction"
            >
              {(
                [
                  { id: 'incoming' as const, label: 'Incoming' },
                  { id: 'outgoing' as const, label: 'Outgoing' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    tab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-surface-container-high text-slate-600 hover:bg-indigo-100/80 hover:text-slate-900',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Filter by status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    status === f.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-surface-container-high text-slate-600 hover:bg-surface-container',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <ErrorMessage
          message={error}
          className="rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100"
        />
      ) : null}

      <section className="space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <SectionTitle>
            {tab === 'incoming' ? 'Incoming requests' : 'Outgoing requests'}
          </SectionTitle>
          {tab === 'incoming' && pending_action_count != null && pending_action_count > 0 ? (
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-800">
              {pending_action_count} action required
            </span>
          ) : null}
        </div>

        {loading ? (
          <ListSkeleton />
        ) : (
          <RequestList
            requests={requests}
            tab={tab}
            emptyTitle={emptyCopy.title}
            emptyDescription={emptyCopy.description}
          />
        )}

        {!loading && totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2 text-sm text-slate-600">
            <p>
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full border border-outline-variant/40 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-full border border-outline-variant/40 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <Link
        href="/requests/new"
        className="fixed bottom-8 right-8 z-20 hidden h-14 w-14 items-center justify-center rounded-full bg-indigo-700 text-white shadow-lg transition-all hover:bg-indigo-800 hover:shadow-xl active:scale-95 md:flex"
        aria-label="Create new request"
      >
        <svg
          className="h-7 w-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </PageContainer>
  );
}
