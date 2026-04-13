'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { processMoneyInput, formatUsdBlur, parseUsdToMinor } from '@/lib/money';

export interface MoneyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> {
  /** Controlled display value — omit to use internal state */
  value?: string;
  /** Called with the formatted display string on every valid keystroke */
  onValueChange?: (display: string) => void;
  /** Called with integer cents whenever the parsed value changes */
  onMinorChange?: (cents: number) => void;
  /** Error message shown below the input */
  error?: string;
  /** Variant: "hero" renders a large editorial-style amount (no border),
   *  "field" renders inside the standard Input chrome. */
  variant?: 'hero' | 'field';
  /** Optional label (only rendered for "field" variant) */
  label?: string;
  /** Optional help text below the input */
  helpText?: string;
}

export function MoneyInput({
  value: controlledValue,
  onValueChange,
  onMinorChange,
  error,
  variant = 'field',
  label,
  helpText,
  className,
  disabled,
  ...rest
}: MoneyInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const canonicalRef = useRef('');

  const display = controlledValue ?? internalValue;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow clearing
      if (raw === '') {
        canonicalRef.current = '';
        setInternalValue('');
        onValueChange?.('');
        onMinorChange?.(0);
        return;
      }

      const result = processMoneyInput(raw);
      if (result === null) return; // reject invalid keystroke

      canonicalRef.current = result.canonical;
      setInternalValue(result.display);
      onValueChange?.(result.display);
      onMinorChange?.(parseUsdToMinor(result.canonical));
    },
    [onValueChange, onMinorChange],
  );

  const handleBlur = useCallback(() => {
    if (canonicalRef.current === '') return;
    const blurred = formatUsdBlur(canonicalRef.current);
    setInternalValue(blurred);
    onValueChange?.(blurred);
  }, [onValueChange]);

  // Sync canonical ref when controlled value changes externally
  useEffect(() => {
    if (controlledValue !== undefined) {
      const stripped = controlledValue.replace(/,/g, '');
      canonicalRef.current = stripped;
    }
  }, [controlledValue]);

  if (variant === 'hero') {
    return (
      <div className={cn('flex flex-col items-start gap-3', className)}>
        {label && (
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </label>
        )}
        <div className="flex items-center gap-1.5 w-full">
          <span className="font-[family-name:var(--font-manrope)] font-bold text-2xl sm:text-3xl text-indigo-600 leading-none">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            aria-label="Amount in dollars"
            aria-invalid={!!error}
            className={cn(
              'w-full bg-transparent border-none p-0 font-[family-name:var(--font-manrope)] font-bold text-2xl sm:text-3xl leading-none text-foreground focus:ring-0 focus:outline-none placeholder:text-outline-variant',
              error && 'text-rose-600',
            )}
            {...rest}
          />
        </div>
        {error && (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // "field" variant — matches existing Input component styling
  const inputId = rest.id ?? rest.name ?? 'money-input';
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
          $
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          className={cn(
            'h-14 w-full rounded-xl border-none bg-slate-50 pl-9 pr-4 text-slate-900 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none',
            error && 'ring-2 ring-rose-500 focus:ring-rose-500',
          )}
          {...rest}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p id={`${inputId}-help`} className="mt-2 text-xs text-slate-400">
          {helpText}
        </p>
      )}
    </div>
  );
}
