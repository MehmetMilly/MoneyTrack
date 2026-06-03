import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute, RootRedirect } from './RouteGuards';
import { RouteSuspense } from './RouteSuspense';
import {
  AccountsPage,
  AppLayout,
  AuthLayout,
  DashboardPage,
  EntriesPage,
  ForgotPasswordPage,
  GoalDetailPage,
  GoalsPage,
  InsightsPage,
  LoginPage,
  NewEntryForm,
  ObligationsPage,
  SettingsPage,
  SignupPage,
} from './routeComponents';

function routeElement(element: ReactNode) {
  return <RouteSuspense>{element}</RouteSuspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  // Auth routes
  {
    element: (
      <PublicOnlyRoute>
        {routeElement(<AuthLayout />)}
      </PublicOnlyRoute>
    ),
    children: [
      { path: '/login', element: routeElement(<LoginPage />) },
      { path: '/signup', element: routeElement(<SignupPage />) },
      { path: '/forgot-password', element: routeElement(<ForgotPasswordPage />) },
    ],
  },
  // App routes
  {
    element: (
      <ProtectedRoute>
        {routeElement(<AppLayout />)}
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: routeElement(<DashboardPage />) },
      { path: '/accounts', element: routeElement(<AccountsPage />) },
      { path: '/transactions', element: routeElement(<EntriesPage />) },
      { path: '/transactions/new', element: routeElement(<NewEntryForm />) },
      { path: '/goals', element: routeElement(<GoalsPage />) },
      { path: '/goals/:id', element: routeElement(<GoalDetailPage />) },
      { path: '/obligations', element: routeElement(<ObligationsPage />) },
      { path: '/reminders', element: routeElement(<ObligationsPage />) },
      { path: '/insights', element: routeElement(<InsightsPage />) },
      { path: '/settings', element: routeElement(<SettingsPage />) },
    ],
  },
]);
