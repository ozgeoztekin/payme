import { Badge } from '@/components/ui/badge';
import type { RequestListEffectiveStatus } from '@/lib/types/api';

const LABELS: Record<RequestListEffectiveStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  declined: 'Declined',
  canceled: 'Canceled',
  expired: 'Expired',
};

export function RequestStatusBadge({
  effectiveStatus,
}: {
  effectiveStatus: RequestListEffectiveStatus;
}) {
  return <Badge variant={effectiveStatus}>{LABELS[effectiveStatus]}</Badge>;
}
