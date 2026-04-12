import { PageContainer } from '@/components/layout/page-layout';

export default function WalletLoading() {
  return (
    <PageContainer className="animate-pulse">
      <div>
        <div className="h-8 w-28 rounded-lg bg-surface-container-high" />
        <div className="mt-2 h-4 w-64 rounded bg-surface-container" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-outline-variant/15">
        <div className="h-3 w-24 rounded bg-surface-container" />
        <div className="mt-3 h-10 w-44 rounded-lg bg-surface-container-high" />
        <div className="mt-2 h-3 w-36 rounded bg-surface-container" />
      </div>

      <div>
        <div className="mb-4 h-6 w-20 rounded bg-surface-container-high" />
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-outline-variant/15">
          <div className="h-5 w-36 rounded bg-surface-container-high" />
          <div className="mt-2 h-4 w-72 rounded bg-surface-container" />
          <div className="mt-5 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-20 rounded-full bg-surface-container" />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-16 rounded bg-surface-container" />
            <div className="h-12 w-full rounded-2xl bg-surface-container" />
          </div>
          <div className="mt-5 h-11 w-full rounded-xl bg-surface-container-high" />
        </div>
      </div>

      <div>
        <div className="mb-4 h-6 w-40 rounded bg-surface-container-high" />
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-outline-variant/15 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-surface-container-high" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-surface-container-high" />
              <div className="h-3 w-48 rounded bg-surface-container" />
            </div>
          </div>
          <div>
            <div className="h-4 w-52 rounded bg-surface-container" />
            <div className="mt-3 h-10 w-full rounded-xl bg-surface-container" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
