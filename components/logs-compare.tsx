'use client';

import { useMemo, useState } from 'react';

export type SearchLog = {
  event: string;
  status: string;
  provider: string;
  session_id: string;
  query: string;
  result_count: number;
  duration_ms: number;
  timestamp: string;
};

export default function LogsCompare({ rows }: { rows: SearchLog[] }) {
  const providers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.provider))).sort(),
    [rows]
  );

  const defaultLeft = providers.find((p) => p.toLowerCase().includes('mixed')) ?? providers[0] ?? '';
  const defaultRight = providers.find((p) => p.toLowerCase().includes('algo')) ?? providers[1] ?? providers[0] ?? '';

  const [leftProvider, setLeftProvider] = useState<string>(defaultLeft);
  const [rightProvider, setRightProvider] = useState<string>(defaultRight);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ProviderColumn
        title="Left"
        provider={leftProvider}
        setProvider={setLeftProvider}
        providers={providers}
        rows={rows}
      />
      <ProviderColumn
        title="Right"
        provider={rightProvider}
        setProvider={setRightProvider}
        providers={providers}
        rows={rows}
      />
    </div>
  );
}

function ProviderColumn({
  title,
  provider,
  setProvider,
  providers,
  rows,
}: {
  title: string;
  provider: string;
  setProvider: (v: string) => void;
  providers: string[];
  rows: SearchLog[];
}) {
  const filtered = useMemo(() => rows.filter((r) => r.provider === provider), [rows, provider]);
  const avg = useMemo(() => {
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, r) => acc + (r.duration_ms ?? 0), 0);
    return Math.round(sum / filtered.length);
  }, [filtered]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="border bg-transparent rounded-md px-2 py-1 text-sm"
        >
          {providers.map((p) => (
            <option key={p} value={p} className="text-black">
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-fd-muted/20">
            <tr>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Query</th>
              <th className="text-left p-2">Results</th>
              <th className="text-left p-2">Duration (ms)</th>
              <th className="text-left p-2">Session</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={`${row.session_id}-${row.timestamp}-${idx}`} className={idx % 2 ? 'bg-fd-muted/10' : ''}>
                <td className="p-2 whitespace-nowrap">{new Date(row.timestamp).toLocaleString()}</td>
                <td className="p-2 whitespace-nowrap">{row.status}</td>
                <td className="p-2">{row.query}</td>
                <td className="p-2 text-right">{row.result_count}</td>
                <td className="p-2 text-right">{row.duration_ms}</td>
                <td className="p-2 font-mono text-xs break-all">{row.session_id}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="p-2 text-sm text-fd-muted-foreground" colSpan={5}>
                Average duration: <span className="font-medium">{avg} ms</span> ({filtered.length} entries)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}


