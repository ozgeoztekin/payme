import { Card } from '@/components/ui/card';
import { RequestStatusBadge } from '@/components/requests/request-status-badge';
import { ExpirationCountdown } from '@/components/requests/expiration-countdown';
import { formatCents } from '@/lib/utils';
import type { PaymentRequestViewRow } from '@/lib/types/database';
import type { RequestListEffectiveStatus } from '@/lib/types/api';

interface RequestDetailProps {
  request: PaymentRequestViewRow;
  requesterName: string;
  /** When true, suppresses action-related helper text and focuses on data display */
  readOnly?: boolean;
}

export function RequestDetail({ request, requesterName, readOnly = false }: RequestDetailProps) {
  const effectiveStatus = request.effective_status as RequestListEffectiveStatus;
  const isPending = effectiveStatus === 'pending';

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Payment Request</p>
            <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-slate-900 tabular-nums">
              {formatCents(request.amount_cents)}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <RequestStatusBadge effectiveStatus={effectiveStatus} />
            {isPending && (
              <ExpirationCountdown
                expiresAt={request.expires_at}
                effectiveStatus={effectiveStatus}
              />
            )}
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">From</dt>
            <dd className="mt-0.5 font-medium text-slate-900 truncate">{requesterName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">To</dt>
            <dd className="mt-0.5 font-medium text-slate-900 truncate">{request.recipient_value}</dd>
          </div>

          {request.note && (
            <div className="col-span-full">
              <dt className="text-slate-500">Note</dt>
              <dd className="mt-0.5 text-slate-900 break-words">{request.note}</dd>
            </div>
          )}

          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-0.5 text-slate-900">
              {new Date(request.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </dd>
          </div>

          {isPending && (
            <div>
              <dt className="text-slate-500">Expires</dt>
              <dd className="mt-0.5 text-slate-900">
                {new Date(request.expires_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
          )}

          {effectiveStatus === 'expired' && (
            <div>
              <dt className="text-slate-500">Expired</dt>
              <dd className="mt-0.5 text-red-700 font-medium">
                {new Date(request.expires_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
          )}

          {!isPending && effectiveStatus !== 'expired' && request.resolved_at && (
            <div>
              <dt className="text-slate-500">Resolved</dt>
              <dd className="mt-0.5 text-slate-900">
                {new Date(request.resolved_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
          )}
        </dl>

        {readOnly && !isPending && (
          <p className="text-sm text-slate-500 border-t border-slate-100 pt-4">
            This request has been{' '}
            <span className="font-medium text-slate-700">{effectiveStatus}</span> and no further
            actions are available.
          </p>
        )}
      </div>
    </Card>
  );
}
