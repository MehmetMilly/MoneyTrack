import { describe, expect, it } from 'vitest';
import {
  buildCategorySpendingInsights,
  buildFinancialRecommendations,
  buildGoalForecast,
  buildMonthlySnapshot,
} from './financialInsights';
import type { Category, Goal, Reminder, Transaction } from './types';

const now = new Date('2026-06-03T12:00:00.000Z');

const categories: Category[] = [
  { id: 'groceries', name: 'Groceries', nameAr: 'Groceries', icon: 'Cart', type: 'expense', color: '#2D5A3D' },
  { id: 'salary', name: 'Salary', nameAr: 'Salary', icon: 'Salary', type: 'income', color: '#3B6B96' },
  { id: 'shopping', name: 'Shopping', nameAr: 'Shopping', icon: 'Bag', type: 'expense', color: '#C4314B' },
];

const transactions: Transaction[] = [
  {
    id: 'income-june',
    type: 'income',
    amount: 12_000,
    accountId: 'checking',
    categoryId: 'salary',
    date: '2026-06-01',
    isRecurring: true,
    createdAt: '2026-06-01',
  },
  {
    id: 'shopping-june',
    type: 'expense',
    amount: 2_800,
    accountId: 'checking',
    categoryId: 'shopping',
    date: '2026-06-02',
    isRecurring: false,
    createdAt: '2026-06-02',
  },
  {
    id: 'groceries-june',
    type: 'expense',
    amount: 1_200,
    accountId: 'checking',
    categoryId: 'groceries',
    date: '2026-06-02',
    isRecurring: false,
    createdAt: '2026-06-02',
  },
  {
    id: 'income-may',
    type: 'income',
    amount: 12_000,
    accountId: 'checking',
    categoryId: 'salary',
    date: '2026-05-01',
    isRecurring: true,
    createdAt: '2026-05-01',
  },
  {
    id: 'shopping-may',
    type: 'expense',
    amount: 1_900,
    accountId: 'checking',
    categoryId: 'shopping',
    date: '2026-05-11',
    isRecurring: false,
    createdAt: '2026-05-11',
  },
];

const reminders: Reminder[] = [
  {
    id: 'due-soon',
    title: 'Phone bill',
    type: 'bill',
    amount: 240,
    dueDate: '2026-06-10',
    status: 'upcoming',
    isRecurring: true,
  },
  {
    id: 'later',
    title: 'Late month card bill',
    type: 'bill',
    amount: 900,
    dueDate: '2026-06-28',
    status: 'upcoming',
    isRecurring: true,
  },
];

const goal: Goal = {
  id: 'goal-1',
  name: 'Emergency fund',
  targetAmount: 10_000,
  currentAmount: 4_000,
  targetDate: '2026-09-01',
  monthlyContribution: 1_000,
  color: '#2D5A3D',
  contributions: [
    { id: 'c-1', amount: 600, date: '2026-04-03', type: 'manual' },
    { id: 'c-2', amount: 600, date: '2026-05-03', type: 'manual' },
  ],
  createdAt: '2026-04-01',
};

describe('monthly snapshot', () => {
  it('summarizes month totals and near-term obligations', () => {
    const snapshot = buildMonthlySnapshot({ transactions, reminders, now });

    expect(snapshot.month).toBe('2026-06');
    expect(snapshot.previousMonth).toBe('2026-05');
    expect(snapshot.income).toBe(12_000);
    expect(snapshot.expenses).toBe(4_000);
    expect(snapshot.net).toBe(8_000);
    expect(snapshot.previousNet).toBe(10_100);
    expect(snapshot.netDelta).toBe(-2_100);
    expect(snapshot.dueSoonCount).toBe(1);
    expect(snapshot.dueSoonTotal).toBe(240);
    expect(snapshot.safeToSpend).toBe(7_760);
  });
});

describe('category insights', () => {
  it('builds ranked category totals with prior-month deltas', () => {
    const categoryInsights = buildCategorySpendingInsights({ transactions, categories, now });

    expect(categoryInsights[0]).toMatchObject({
      categoryId: 'shopping',
      amount: 2_800,
      previousAmount: 1_900,
      deltaAmount: 900,
    });
    expect(categoryInsights[0].shareOfExpenses).toBeCloseTo(0.7, 4);
  });
});

describe('goal forecast', () => {
  it('calculates required pace and marks off-track goals', () => {
    const forecast = buildGoalForecast(goal, now);

    expect(forecast.remainingAmount).toBe(6_000);
    expect(forecast.monthsLeft).toBe(4);
    expect(forecast.requiredMonthlyContribution).toBe(1_500);
    expect(forecast.averageMonthlyContribution).toBe(600);
    expect(forecast.isOffTrack).toBe(true);
  });
});

describe('recommendations', () => {
  it('highlights obligations, overspending, and goal pace', () => {
    const snapshot = buildMonthlySnapshot({ transactions, reminders, now });
    const categoryInsights = buildCategorySpendingInsights({ transactions, categories, now });
    const goalForecast = [buildGoalForecast(goal, now)];
    const recommendations = buildFinancialRecommendations({ snapshot, categoryInsights, goals: goalForecast });

    expect(recommendations.map((item) => item.kind)).toContain('obligation');
    expect(recommendations.map((item) => item.kind)).toContain('spending');
    expect(recommendations.map((item) => item.kind)).toContain('goal');
    expect(recommendations.find((item) => item.kind === 'goal')?.tone).toBe('warning');
  });
});
