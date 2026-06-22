import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center sm:py-20">
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-bg-elevated text-text-muted sm:h-20 sm:w-20">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      <p className="mb-7 mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          {actionLabel}
        </Link>
      )}
      {action}
    </div>
  );
}
