'use client';

import { useEffect, useMemo, useState } from 'react';
import LogsCompare, { type SearchLog } from '@/components/logs-compare';

export default function LogsClient() {
  const [rows, setRows] = useState<SearchLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/logs?limit=500', { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load logs');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const content = useMemo(() => {
    if (error) return <p className="text-red-500">{error}</p>;
    if (!rows) return <p className="text-sm text-fd-muted-foreground">Loading logs…</p>;
    if (rows.length === 0) return <p className="text-sm text-fd-muted-foreground">No logs found.</p>;
    return <LogsCompare rows={rows} />;
  }, [rows, error]);

  return <div>{content}</div>;
}


