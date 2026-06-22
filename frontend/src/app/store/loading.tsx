import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';

export default function StoreLoading() {
  return (
    <div aria-busy="true" aria-label="Loading store">
      <Container className="py-8">
        <header className="mb-7 border-b border-border pb-6">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="mt-3 h-10 w-full max-w-sm rounded" />
          <Skeleton className="mt-3 h-5 w-full max-w-xl rounded" />
        </header>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="h-11 w-28 rounded-lg lg:hidden" />
            </div>
            <div className="mt-5 hidden space-y-5 border-t border-border pt-5 lg:block">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </aside>

          <div className="grid grid-cols-1 items-stretch gap-4 min-[480px]:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border bg-white p-3 shadow-sm sm:p-4">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="mt-4 h-4 w-28 rounded" />
                <Skeleton className="mt-3 h-10 w-full rounded" />
                <Skeleton className="mt-3 h-6 w-24 rounded" />
                <Skeleton className="mt-2 h-3 w-16 rounded" />
                <Skeleton className="mt-4 h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
