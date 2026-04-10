'use client';

import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label: string;
  error?: string;
  options: readonly SelectOption[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, className, id, name, ...rest },
  ref,
) {
  const genId = useId();
  const selectId = id ?? name ?? genId;
  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={selectId}
        className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cn(
          'h-14 w-full appearance-none rounded-xl border-none bg-slate-50 px-4 pr-10 text-slate-900 transition-shadow focus:ring-2 focus:ring-indigo-600 focus:outline-none',
          error && 'ring-2 ring-rose-500 focus:ring-rose-500',
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.25rem',
        }}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${selectId}-error`} className="mt-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
