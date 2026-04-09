import { cn } from '@/lib/utils';

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '';
  const minutes = Math.ceil(ms / (60 * 1000));
  if (minutes < 60) {
    return `Expires in ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `Expires in ${hours}h`;
  }
  const days = Math.ceil(hours / 24);
  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
}

export function ExpirationCountdown({
  expiresAt,
  effectiveStatus,
}: {
  expiresAt: string;
  effectiveStatus: string;
}) {
  if (effectiveStatus !== 'pending') {
    return null;
  }

  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const remaining = expires - now;
  if (remaining <= 0) {
    return null;
  }

  const hoursLeft = remaining / (1000 * 60 * 60);
  const urgent = hoursLeft <= 24;

  return (
    <span className={cn('text-xs', urgent ? 'font-medium text-amber-700' : 'text-slate-500')}>
      {formatTimeRemaining(remaining)}
    </span>
  );
}
