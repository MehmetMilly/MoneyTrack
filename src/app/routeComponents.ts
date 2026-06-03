import { lazy } from 'react';

export const AuthLayout = lazy(() => import('../features/auth/AuthLayout'));
export const LoginPage = lazy(() => import('../features/auth/LoginPage'));
export const SignupPage = lazy(() => import('../features/auth/SignupPage'));
export const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage'));
export const AppLayout = lazy(() => import('./layouts/AppLayout'));
export const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
export const AccountsPage = lazy(() => import('../features/accounts/AccountsPage'));
export const EntriesPage = lazy(() => import('../features/entries/EntriesPage'));
export const NewEntryForm = lazy(() => import('../features/entries/NewEntryForm'));
export const GoalsPage = lazy(() => import('../features/goals/GoalsPage'));
export const GoalDetailPage = lazy(() => import('../features/goals/GoalDetailPage'));
export const ObligationsPage = lazy(() => import('../features/obligations/ObligationsPage'));
export const InsightsPage = lazy(() => import('../features/insights/InsightsPage'));
export const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
