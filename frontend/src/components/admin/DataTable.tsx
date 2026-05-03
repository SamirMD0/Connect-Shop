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
      <div className="bg-surface border border-slate-800 rounded-xl p-8 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-900/50 border-b border-slate-800 text-muted">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-slate-800/20 transition-colors">
              {columns.map((col, i) => (
                <td key={i} className="px-6 py-4">
                  {col.cell ? col.cell(item) : String(item[col.accessorKey as keyof T])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
