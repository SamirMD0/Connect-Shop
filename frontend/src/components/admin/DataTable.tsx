import React from 'react';

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
}

export function DataTable<T>({ data, columns, keyExtractor, emptyMessage = 'No data available' }: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-admin-border bg-admin-surface p-10 text-center shadow-xl shadow-black/20">
        <p className="text-sm font-medium text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-surface shadow-xl shadow-black/20">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="border-b border-admin-border bg-admin-bg/80 text-slate-400">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em]">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-border">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="text-white transition-colors hover:bg-white/[0.04]">
              {columns.map((col, i) => (
                <td key={i} className="px-6 py-4 align-middle">
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
