import { Skeleton } from '@/components/ui/Skeleton';

export function ProductSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-sm sm:p-4" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-6 w-24 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
