'use client';

import type { ReactNode } from 'react';

type PhantomSkeletonProps = {
  loading: boolean;
  children: ReactNode;
  count?: number;
  countGap?: number;
  animation?: 'shimmer' | 'pulse' | 'breathe' | 'solid';
  className?: string;
};

export function PhantomSkeleton({
  loading,
  children,
  count,
  countGap,
  animation = 'shimmer',
  className,
}: PhantomSkeletonProps) {
  return (
    <phantom-ui
      loading={loading ? true : undefined}
      animation={animation}
      count={count}
      count-gap={countGap}
      className={className}
    >
      {children}
    </phantom-ui>
  );
}
