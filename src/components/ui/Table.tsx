import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  emptyState: React.ReactNode;
  caption?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  emptyState,
  caption,
}: TableProps<T>) {
  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E1EAE4]">
      <table className="w-full border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-[#E1EAE4] bg-[#F6F8F3]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={[
                  'px-4 py-3 text-xs font-semibold text-[#64766C] whitespace-nowrap',
                  col.align === 'right' ? 'text-right' : 'text-left',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E1EAE4] bg-white">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-[#F6F8F3]/70 transition-colors duration-150">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    'px-4 py-3 text-sm text-[#18392C]',
                    col.align === 'right' ? 'text-right font-mono tabular-nums' : 'text-left',
                  ].join(' ')}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
