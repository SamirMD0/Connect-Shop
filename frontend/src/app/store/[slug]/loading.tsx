import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading product">
      <Container className="py-8">
        <Skeleton className="mb-8 h-5 w-full max-w-sm rounded" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)] lg:gap-12">
          <div>
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="mt-4 flex gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[72px] w-[72px] shrink-0 rounded-lg sm:h-20 sm:w-20" />
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="mt-3 h-10 w-full max-w-lg rounded" />
            <Skeleton className="mt-4 h-4 w-52 rounded" />
            <Skeleton className="mt-5 h-11 w-44 rounded" />
            <Skeleton className="mt-4 h-6 w-24 rounded-full" />

            <div className="mt-6">
              <Skeleton className="h-4 w-32 rounded" />
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-28 rounded-lg" />
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5">
              <Skeleton className="h-5 w-40 rounded" />
              <div className="my-4 grid gap-2 sm:grid-cols-2">
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_48px] gap-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-7">
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="mt-3 h-5 w-full rounded" />
              <Skeleton className="mt-2 h-5 w-4/5 rounded" />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
