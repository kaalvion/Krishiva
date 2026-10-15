import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No records found.',
  emptyAction,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 space-y-3">
          <div className="h-6 bg-slate-100 rounded-md w-full animate-pulse" />
          <div className="h-10 bg-slate-100/60 rounded-md w-full animate-pulse" />
          <div className="h-10 bg-slate-100/60 rounded-md w-full animate-pulse" />
          <div className="h-10 bg-slate-100/60 rounded-md w-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs">
        <p className="text-sm text-slate-500 mb-3">{emptyMessage}</p>
        {emptyAction && <div className="flex justify-center">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-xs tracking-wider uppercase">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-4 ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {data.map((row) => {
              const key = keyExtractor(row);
              const isClickable = !!onRowClick;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    isClickable
                      ? 'hover:bg-slate-50/90 cursor-pointer'
                      : 'hover:bg-slate-50/40'
                  }`}
                >
                  {columns.map((col, colIdx) => {
                    const content =
                      typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as unknown as React.ReactNode);

                    return (
                      <td
                        key={colIdx}
                        className={`py-3.5 px-4 align-middle ${col.className || ''}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
