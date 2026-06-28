import React from 'react';
import { Inbox } from 'lucide-react';
import { PhantomSkeleton } from '../ui/PhantomSkeleton';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  loading?: boolean;
  loadingRows?: number;
  renderMobileCard?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  loading = false,
  loadingRows = 5,
  renderMobileCard,
}: DataTableProps<T>) {
  if (loading) {
    const rows = Array.from({ length: loadingRows });

    return (
      <PhantomSkeleton loading={loading} className="block">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className="px-5 py-4 text-xs font-bold uppercase tracking-[0.14em]">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200" aria-hidden="true">
                {rows.map((_, rowIndex) => (
                  <tr key={`loading-row-${rowIndex}`} className="text-[#0B1B48]">
                    {columns.map((col, colIndex) => (
                      <td key={`${col.header}-${colIndex}`} className="px-5 py-4 align-middle">
                        <span className="inline-block text-slate-500">
                          {colIndex === 0 ? 'Loading item' : 'Loading'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PhantomSkeleton>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm shadow-slate-200/80">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-[#0B1B48]">{emptyMessage}</p>
        <p className="mt-1 text-xs text-slate-500">Data will appear here when available.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
      {renderMobileCard && (
        <div className="divide-y divide-slate-200 md:hidden">
          {data.map((item) => (
            <div key={keyExtractor(item)} className="p-4">
              {renderMobileCard(item)}
            </div>
          ))}
        </div>
      )}
      <div className={`overflow-x-auto ${renderMobileCard ? 'hidden md:block' : ''}`}>
      <table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-5 py-4 text-xs font-bold uppercase tracking-[0.14em]">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="text-[#0B1B48] transition-colors hover:bg-blue-50/50">
              {columns.map((col, i) => (
                <td key={i} className="px-5 py-4 align-middle">
                  {col.cell ? col.cell(item) : String(item[col.accessorKey as keyof T])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
