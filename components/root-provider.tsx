'use client';

import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import CustomSearchDialog from './custom-search-dialog';
import AlgoliaSearchDialog from './algolia-search-dialog';

export type ProviderKind = 'mixedbread' | 'algolia';

export interface CustomRootProviderProps {
  children: ReactNode;
  provider?: ProviderKind;
}

export function CustomRootProvider({ children, provider = 'mixedbread' }: CustomRootProviderProps) {
  const searchDialog = provider === 'algolia' ? AlgoliaSearchDialog : CustomSearchDialog;

  return (
    <RootProvider
      search={{
        SearchDialog: searchDialog,
        options: provider === 'mixedbread' ? { api: '/api/vector-store' } : undefined,
      }}
    >
      {children}
    </RootProvider>
  );
} 