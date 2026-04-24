interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-bg-elevated/50 rounded-xl skeleton-shimmer ${className}`}
      aria-hidden="true"
    />
  );
}
