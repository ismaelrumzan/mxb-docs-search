import type { ReactNode } from 'react';
import { CustomRootProvider } from '@/components/root-provider';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <CustomRootProvider
      provider="algolia"
    >
      {children}
    </CustomRootProvider>
  );
}


