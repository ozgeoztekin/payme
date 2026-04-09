import type { PaymentRequestListItem, RequestListTab } from '@/lib/types/api';
import { EmptyState } from '@/components/ui/empty-state';
import { RequestCard } from './request-card';

export function RequestList({
  requests,
  tab,
  emptyTitle,
  emptyDescription,
}: {
  requests: PaymentRequestListItem[];
  tab: RequestListTab;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant/20 bg-white shadow-sm">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-white shadow-sm">
      <div className="flex flex-col divide-y divide-outline-variant/10">
        {requests.map((item) => (
          <RequestCard key={item.id} item={item} tab={tab} />
        ))}
      </div>
    </div>
  );
}
