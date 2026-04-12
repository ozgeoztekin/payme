import { PageContainer } from '@/components/layout/page-layout';

export default function NewRequestLoading() {
  return (
    <PageContainer className="animate-pulse">
      <div>
        <div className="h-8 w-48 rounded-lg bg-surface-container-high" />
        <div className="mt-2 h-5 w-72 rounded bg-surface-container" />
      </div>

      <div className="w-full space-y-6">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-10">
          <div className="h-3 w-32 rounded bg-surface-container" />
          <div className="mt-4 h-14 w-full rounded-lg bg-surface-container-high" />
        </div>

        <div className="space-y-6 rounded-[2rem] bg-surface-container-low p-6 sm:p-8">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded bg-surface-container" />
            <div className="flex gap-2">
              <div className="h-10 w-20 rounded-full bg-surface-container-high" />
              <div className="h-10 w-20 rounded-full bg-surface-container" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-surface-container" />
            <div className="h-12 w-full rounded-2xl bg-white" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-surface-container" />
            <div className="h-24 w-full rounded-2xl bg-white" />
          </div>
        </div>

        <div className="h-16 w-full rounded-full bg-surface-container-high" />
      </div>
    </PageContainer>
  );
}
