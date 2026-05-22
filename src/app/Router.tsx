import { createBrowserRouter } from 'react-router-dom';
import AuthLayout from '../features/auth/AuthLayout';
import LoginPage from '../features/auth/LoginPage';
import SignupPage from '../features/auth/SignupPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import AppLayout from './layouts/AppLayout';
import DashboardPage from '../features/dashboard/DashboardPage';
import AccountsPage from '../features/accounts/AccountsPage';
import EntriesPage from '../features/entries/EntriesPage';
import NewEntryForm from '../features/entries/NewEntryForm';
import GoalsPage from '../features/goals/GoalsPage';
import GoalDetailPage from '../features/goals/GoalDetailPage';
import ObligationsPage from '../features/obligations/ObligationsPage';
import InsightsPage from '../features/insights/InsightsPage';
import SettingsPage from '../features/settings/SettingsPage';
import { ProtectedRoute, PublicOnlyRoute, RootRedirect } from './RouteGuards';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  // Auth routes
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  // App routes
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/transactions', element: <EntriesPage /> },
      { path: '/transactions/new', element: <NewEntryForm /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/goals/:id', element: <GoalDetailPage /> },
      { path: '/obligations', element: <ObligationsPage /> },
      { path: '/reminders', element: <ObligationsPage /> },
      { path: '/insights', element: <InsightsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);
