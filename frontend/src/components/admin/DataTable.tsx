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
      <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-8 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-[#12121a] border border-[#1e293b] rounded-xl overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[#0a0a14] border-b border-[#1e293b] text-slate-400">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 font-medium text-xs uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e293b]">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-[#1e293b]/30 transition-colors text-white">
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
