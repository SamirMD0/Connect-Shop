'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconOnly?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'border border-transparent bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:bg-accent-hover',
  secondary:
    'border border-border bg-bg-surface text-text-primary shadow-sm hover:border-border-strong hover:bg-bg-elevated',
  outline:
    'border border-accent bg-transparent text-accent hover:bg-accent/10',
  ghost:
    'border border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  danger:
    'border border-transparent bg-danger text-white shadow-sm hover:brightness-90',
};

const sizeStyles: Record<Size, string> = {
  sm: 'min-h-9 rounded-md px-3 py-1.5 text-xs',
  md: 'min-h-11 rounded-lg px-4 py-2.5 text-sm',
  lg: 'min-h-12 rounded-lg px-6 py-3 text-base',
};

const iconOnlyStyles: Record<Size, string> = {
  sm: 'h-9 w-9 rounded-md p-0',
  md: 'h-11 w-11 rounded-lg p-0',
  lg: 'h-12 w-12 rounded-lg p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, iconOnly = false, className = '', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        className={`
          inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-semibold
          transition-[background-color,border-color,color,box-shadow,opacity] duration-200
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
          disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50
          ${variantStyles[variant]}
          ${iconOnly ? iconOnlyStyles[size] : sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
