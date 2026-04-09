import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function Card({
  header,
  footer,
  children,
  className,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl bg-white p-6 shadow-sm sm:p-8', className)}>
      {header != null ? <div className="mb-6">{header}</div> : null}
      <div>{children}</div>
      {footer != null ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
