import { Suspense, type ReactNode } from 'react';

function RouteFallback() {
  return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Loading MoneyTrack...</div>;
}

export function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}
