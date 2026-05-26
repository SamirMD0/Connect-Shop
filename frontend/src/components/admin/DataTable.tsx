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
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm shadow-slate-200/80">
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em]">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="text-[#0B1B48] transition-colors hover:bg-blue-50/50">
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
