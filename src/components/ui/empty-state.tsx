'use client';

import type { ReactNode } from 'react';
import { Button } from './button';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {icon != null ? (
        <div className="mb-4 text-slate-400 [&>svg]:h-12 [&>svg]:w-12">{icon}</div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? (
        <Button type="button" className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
