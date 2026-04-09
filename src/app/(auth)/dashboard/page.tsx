import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-slate-500">
          Your incoming and outgoing payment requests will appear here. For now,
          create a request to get started.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-500">
          Request lists, search, and filters are coming in a later milestone.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/requests/new"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 text-base font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            New payment request
          </Link>
        </div>
      </div>
    </div>
  );
}
