import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from './dashboard/DashboardPage';
import EntriesPage from './entries/EntriesPage';
import GoalDetailPage from './goals/GoalDetailPage';
import GoalsPage from './goals/GoalsPage';
import InsightsPage from './insights/InsightsPage';
import ObligationsPage from './obligations/ObligationsPage';
import { useAppStore } from '../lib/data/store';
import {
  defaultCategories,
  demoAccounts,
  demoDebts,
  demoGoals,
  demoInstallments,
  demoPlanningEntries,
  demoReminders,
  demoTransactions,
} from '../lib/data/demoData';

const baseState = useAppStore.getState();

function seedAppState() {
  useAppStore.setState((state) => ({
    ...state,
    sessionMode: 'demo',
    authStatus: 'authenticated',
    isAuthenticated: true,
    currentUserId: 'demo-user',
    profile: { name: 'Demo User', email: 'demo@example.com' },
    settings: {
      ...state.settings,
      planner: {
        ...state.settings.planner,
        primaryGoalId: 'goal-laptop',
      },
    },
    accounts: [...demoAccounts],
    transactions: [...demoTransactions],
    categories: [...defaultCategories],
    debts: [...demoDebts],
    installments: [...demoInstallments],
    goals: [...demoGoals],
    reminders: [...demoReminders],
    planningEntries: [...demoPlanningEntries],
    loading: {
      auth: false,
      bootstrap: false,
      settings: false,
      accounts: false,
      transactions: false,
      planning: false,
      goals: false,
      obligations: false,
    },
    errors: {
      auth: null,
      bootstrap: null,
      settings: null,
      accounts: null,
      transactions: null,
      planning: null,
      goals: null,
      obligations: null,
    },
  }));
}

afterEach(() => {
  useAppStore.setState(baseState);
});

describe('authenticated page smoke renders', () => {
  it('renders dashboard page', () => {
    seedAppState();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(html).toContain('What deserves attention');
    expect(html).toContain('Month net');
  });

  it('renders planner entries page', () => {
    seedAppState();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EntriesPage />
      </MemoryRouter>
    );

    expect(html).toContain('Expected items');
    expect(html).toContain('Filter entries by state');
  });

  it('renders insights page', () => {
    seedAppState();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>
    );

    expect(html).toContain('What should I do next?');
    expect(html).toContain('Upcoming cash demands');
  });

  it('renders goals page and goal detail page', () => {
    seedAppState();
    const goalsHtml = renderToStaticMarkup(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    );

    expect(goalsHtml).toContain('Goals');

    const detailHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/goals/goal-laptop']}>
        <Routes>
          <Route path="/goals/:id" element={<GoalDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(detailHtml).toContain('No data');
  });

  it('renders obligations page', () => {
    seedAppState();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ObligationsPage />
      </MemoryRouter>
    );

    expect(html).toContain('Due in 14 days');
    expect(html).toContain('Open debt load');
  });
});
