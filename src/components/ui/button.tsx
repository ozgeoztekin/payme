'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

const variantClasses = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
} as const;

const sizeClasses = {
  sm: 'min-h-12 px-4 text-sm',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-12 px-6 text-lg',
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner
            size="sm"
            className={
              variant === 'secondary' || variant === 'ghost'
                ? undefined
                : 'border-white/30 border-t-white'
            }
          />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
});
