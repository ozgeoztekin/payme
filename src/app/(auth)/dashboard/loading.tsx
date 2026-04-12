import { PageContainer } from '@/components/layout/page-layout';

export default function DashboardLoading() {
  return (
    <PageContainer size="lg" className="animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-8 w-40 rounded-lg bg-surface-container-high" />
          <div className="mt-3 h-4 w-72 rounded bg-surface-container" />
        </div>
        <div className="h-11 w-48 rounded-full bg-surface-container-high" />
      </div>

      <div className="rounded-2xl bg-surface-container-low p-6 shadow-sm ring-1 ring-outline-variant/15">
        <div className="flex flex-col gap-6">
          <div className="h-12 w-full max-w-md rounded-full bg-surface-container" />
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-full bg-surface-container-high" />
            <div className="h-10 w-28 rounded-full bg-surface-container" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-surface-container" />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-7 w-44 rounded bg-surface-container-high" />
        <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-white shadow-sm">
          <div className="flex flex-col divide-y divide-outline-variant/10">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
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
      </div>
    </PageContainer>
  );
}
