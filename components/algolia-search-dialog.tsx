'use client';

import { liteClient } from 'algoliasearch/lite';
import { SearchDialog, type SharedProps } from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { useEffect, useRef } from 'react';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '';
const ALGOLIA_API_KEY = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY ?? '';
const ALGOLIA_INDEX = process.env.NEXT_PUBLIC_ALGOLIA_INDEX ?? '';
const client = liteClient(ALGOLIA_APP_ID, ALGOLIA_API_KEY);

export default function CustomSearchDialog(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    type: 'algolia',
    client,
    indexName: ALGOLIA_INDEX,
  });

  const startTimeRef = useRef<number | null>(null);
  const lastSearchRef = useRef<string>('');
  const lastLoggedKeyRef = useRef<string>('');

  useEffect(() => {
    if (search && search !== lastSearchRef.current) {
      startTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      lastSearchRef.current = search;
    }
  }, [search]);

  useEffect(() => {
    if (query.isLoading) return;
    const data: any = (query as any).data;
    const resultsCount = data === 'empty' ? 0 : Array.isArray(data) ? data.length : 0;
    const duration = startTimeRef.current
      ? Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTimeRef.current)
      : 0;
    const key = `${search}|${resultsCount}`;
    if (search && key !== lastLoggedKeyRef.current) {
      lastLoggedKeyRef.current = key;
      void fetch('/api/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'algolia',
          query: search,
          result_count: resultsCount,
          duration_ms: duration,
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [query.isLoading, (query as any).data, search]);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      results={query.data ?? 'empty'}
      {...props}
    />
  );
}


