import { PageContainer } from '@/components/layout/page-layout';

export default function ProfileLoading() {
  return (
    <PageContainer size="sm" className="animate-pulse">
      <div>
        <div className="h-8 w-40 bg-surface-container-high rounded" />
      </div>
      <div className="space-y-4 rounded-xl border border-outline-variant/20 bg-white p-6">
        <div>
          <div className="h-4 w-16 bg-surface-container-high rounded mb-2" />
          <div className="h-5 w-48 bg-surface-container rounded" />
        </div>
        <div>
          <div className="h-4 w-24 bg-surface-container-high rounded mb-2" />
          <div className="h-5 w-40 bg-surface-container rounded" />
        </div>
      </div>
      <div className="space-y-4 rounded-xl border border-outline-variant/20 bg-white p-6">
        <div className="h-10 w-full bg-surface-container rounded" />
        <div className="h-10 w-full bg-surface-container-high rounded" />
      </div>
    </PageContainer>
  );
}
