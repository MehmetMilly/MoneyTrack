import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../lib/data/store';

function AuthLoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <div>Loading MoneyTrack...</div>
    </div>
  );
}

export function RootRedirect() {
  const authStatus = useAppStore((state) => state.authStatus);

  if (authStatus === 'loading') {
    return <AuthLoadingScreen />;
  }

  return <Navigate to={authStatus === 'authenticated' ? '/dashboard' : '/login'} replace />;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const authStatus = useAppStore((state) => state.authStatus);

  if (authStatus === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const authStatus = useAppStore((state) => state.authStatus);

  if (authStatus === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
