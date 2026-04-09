'use client';

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helpText?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helpText, className, id, name, ...rest },
  ref,
) {
  const genId = useId();
  const inputId = id ?? name ?? genId;
  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={inputId}
        className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
        className={cn(
          'h-14 w-full rounded-xl border-none bg-slate-50 px-4 text-slate-900 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none',
          error && 'ring-2 ring-rose-500 focus:ring-rose-500',
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {helpText && !error ? (
        <p id={`${inputId}-help`} className="mt-2 text-xs text-slate-400">
          {helpText}
        </p>
      ) : null}
    </div>
  );
});
