'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number;
  totalPages: number;
}

export function StorePagination({ currentPage, totalPages }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const updateParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', page.toString());
      router.push(`/store?${params.toString()}`);
    },
    [searchParams, router]
  );

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => updateParams(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Go to previous store page"
        className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-bg-surface text-text-muted hover:text-text-primary hover:border-slate-300 transition-all disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>
      
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => updateParams(page)}
            aria-label={`Go to store page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`w-10 h-10 rounded-xl text-sm font-medium border transition-all ${
              page === currentPage
                ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
                : 'border-slate-200 bg-bg-surface text-text-muted hover:text-text-primary hover:border-slate-300'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
      
      <button
        onClick={() => updateParams(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Go to next store page"
        className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-bg-surface text-text-muted hover:text-text-primary hover:border-slate-300 transition-all disabled:opacity-40 disabled:pointer-events-none"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
