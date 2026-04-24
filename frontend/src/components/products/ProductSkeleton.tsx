import { Skeleton } from '@/components/ui/Skeleton';

export function ProductSkeleton() {
  return (
    <div className="rounded-2xl bg-bg-surface/50 border border-white/5 overflow-hidden">
      <Skeleton className="w-full h-52 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
