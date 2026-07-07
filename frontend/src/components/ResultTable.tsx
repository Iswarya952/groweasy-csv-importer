'use client';

import { useState } from 'react';
import { CrmRecord, SkippedRecord } from '@/types';

const CRM_COLUMNS: (keyof CrmRecord)[] = [
  'created_at',
  'name',
  'email',
  'country_code',
  'mobile_without_country_code',
  'company',
  'city',
  'state',
  'country',
  'lead_owner',
  'crm_status',
  'crm_note',
  'data_source',
  'possession_time',
  'description',
];

const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: 'bg-accent/10 text-accent-muted dark:text-accent border-accent/30',
  DID_NOT_CONNECT: 'bg-signal/10 text-signal border-signal/30',
  BAD_LEAD: 'bg-danger/10 text-danger border-danger/30',
  SALE_DONE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
};

interface ResultTableProps {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
}

export default function ResultTable({
  imported,
  skipped,
  totalImported,
  totalSkipped,
  totalRows,
}: ResultTableProps) {
  const [tab, setTab] = useState<'imported' | 'skipped'>('imported');

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Total rows" value={totalRows} tone="neutral" />
        <StatCard label="Imported" value={totalImported} tone="success" />
        <StatCard label="Skipped" value={totalSkipped} tone="danger" />
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-925 p-1 w-fit">
        <button
          onClick={() => setTab('imported')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'imported'
              ? 'bg-white dark:bg-panel shadow-sm text-slate-900 dark:text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Imported ({totalImported})
        </button>
        <button
          onClick={() => setTab('skipped')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'skipped'
              ? 'bg-white dark:bg-panel shadow-sm text-slate-900 dark:text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Skipped ({totalSkipped})
        </button>
      </div>

      {tab === 'imported' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-925 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-925 px-4 py-3 text-left font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    #
                  </th>
                  {CRM_COLUMNS.map((c) => (
                    <th
                      key={c}
                      className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imported.map((record, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 dark:border-slate-800/60 odd:bg-white even:bg-slate-50/50 dark:odd:bg-transparent dark:even:bg-panel/30 hover:bg-accent/5"
                  >
                    <td className="sticky left-0 bg-inherit px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {i + 1}
                    </td>
                    {CRM_COLUMNS.map((c) => (
                      <td key={c} className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {c === 'crm_status' && record[c] ? (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[record[c]] || ''}`}
                          >
                            {record[c]}
                          </span>
                        ) : (
                          record[c] || <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {imported.length === 0 && (
                  <tr>
                    <td colSpan={CRM_COLUMNS.length + 1} className="px-4 py-10 text-center text-slate-400">
                      No records were imported.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-925 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Row #
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Reason skipped
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Original row data
                  </th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((s, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 dark:border-slate-800/60 odd:bg-white even:bg-slate-50/50 dark:odd:bg-transparent dark:even:bg-panel/30"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {s.rowIndex + 1}
                    </td>
                    <td className="px-4 py-2.5 text-danger whitespace-nowrap">{s.reason}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-mono text-xs max-w-md truncate">
                      {JSON.stringify(s.row)}
                    </td>
                  </tr>
                ))}
                {skipped.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                      Nothing was skipped — clean import.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'danger';
}) {
  const toneClasses = {
    neutral: 'text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800',
    success: 'text-accent-muted dark:text-accent border-accent/30 bg-accent/5',
    danger: 'text-danger border-danger/30 bg-danger/5',
  }[tone];

  return (
    <div className={`rounded-xl border px-5 py-4 ${toneClasses}`}>
      <p className="font-mono text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
