'use client';

interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
}

export default function PreviewTable({ headers, rows }: PreviewTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-925 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-925 px-4 py-3 text-left font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                #
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap"
                >
                  {h || '(blank header)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 dark:border-slate-800/60 odd:bg-white even:bg-slate-50/50 dark:odd:bg-transparent dark:even:bg-panel/30 hover:bg-accent/5"
              >
                <td className="sticky left-0 bg-inherit px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                  {i + 1}
                </td>
                {headers.map((h) => (
                  <td key={h} className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {row[h] || <span className="text-slate-300 dark:text-slate-700">—</span>}
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
