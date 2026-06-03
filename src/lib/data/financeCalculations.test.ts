import { describe, expect, it } from 'vitest';
import {
  applyTransactionBalance,
  goalProgressPercent,
  plannerTotals,
  planningEntryAmount,
  remainingDebtAmount,
  transactionBalanceDelta,
} from './financeCalculations';
import type { Account, Debt, Goal, PlanningEntry, Transaction } from './types';

const account: Account = {
  id: 'checking',
  name: 'Checking',
  type: 'bank',
  balance: 1_000,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 100,
    accountId: 'checking',
    categoryId: 'cat',
    date: '2026-01-01',
    isRecurring: false,
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function debt(overrides: Partial<Debt>): Debt {
  return {
    id: 'debt-1',
    name: 'Debt',
    type: 'owed_by_me',
    totalAmount: 1_000,
    paidAmount: 250,
    creditor: 'Person',
    status: 'active',
    payments: [],
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function planningEntry(overrides: Partial<PlanningEntry>): PlanningEntry {
  return {
    id: 'plan-1',
    kind: 'positive',
    status: 'expected',
    category: 'salary',
    title: 'Salary',
    expectedAmount: 1_000,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('transaction balance calculations', () => {
  it('adds income to the source account', () => {
    const income = transaction({ type: 'income', amount: 400 });

    expect(transactionBalanceDelta(income, 'checking')).toBe(400);
    expect(applyTransactionBalance(account, income)).toBe(1_400);
    expect(applyTransactionBalance(account, income, -1)).toBe(600);
  });

  it('subtracts expenses from the source account and reverses them on delete', () => {
    const expense = transaction({ type: 'expense', amount: 125 });

    expect(transactionBalanceDelta(expense, 'checking')).toBe(-125);
    expect(applyTransactionBalance(account, expense)).toBe(875);
    expect(applyTransactionBalance(account, expense, -1)).toBe(1_125);
  });

  it('moves transfer amounts from source to destination', () => {
    const transfer = transaction({
      type: 'transfer',
      amount: 300,
      accountId: 'checking',
      toAccountId: 'savings',
    });

    expect(transactionBalanceDelta(transfer, 'checking')).toBe(-300);
    expect(transactionBalanceDelta(transfer, 'savings')).toBe(300);
    expect(transactionBalanceDelta(transfer, 'cash')).toBe(0);
  });

  it('applies and reverses a transfer on both affected accounts', () => {
    const savings: Account = { ...account, id: 'savings', balance: 200 };
    const transfer = transaction({
      type: 'transfer',
      amount: 300,
      accountId: 'checking',
      toAccountId: 'savings',
    });

    expect(applyTransactionBalance(account, transfer)).toBe(700);
    expect(applyTransactionBalance(savings, transfer)).toBe(500);
    expect(applyTransactionBalance(account, transfer, -1)).toBe(1_300);
    expect(applyTransactionBalance(savings, transfer, -1)).toBe(-100);
  });

  it('ignores transactions that do not touch the account', () => {
    const expense = transaction({ type: 'expense', amount: 125, accountId: 'other' });

    expect(transactionBalanceDelta(expense, 'checking')).toBe(0);
    expect(applyTransactionBalance(account, expense)).toBe(1_000);
  });
});

describe('planner calculations', () => {
  it('uses actual amounts for confirmed planning entries', () => {
    expect(planningEntryAmount(planningEntry({ status: 'confirmed', expectedAmount: 500, actualAmount: 450 }))).toBe(450);
    expect(planningEntryAmount(planningEntry({ status: 'cancelled', expectedAmount: 500 }))).toBe(0);
  });

  it('calculates positive, negative, and net planner totals', () => {
    const totals = plannerTotals({
      accounts: [account],
      debts: [
        debt({ type: 'owed_to_me', totalAmount: 500, paidAmount: 100 }),
        debt({ type: 'owed_by_me', totalAmount: 900, paidAmount: 300 }),
      ],
      planningEntries: [
        planningEntry({ id: 'salary', kind: 'positive', status: 'confirmed', expectedAmount: 2_000, actualAmount: 1_900 }),
        planningEntry({ id: 'bill', kind: 'negative', status: 'expected', category: 'bill', expectedAmount: 250 }),
        planningEntry({ id: 'cancelled', kind: 'negative', status: 'cancelled', category: 'expense', expectedAmount: 999 }),
      ],
      includeExpectedEntries: true,
    });

    expect(totals).toEqual({
      positive: 3_300,
      negative: 850,
      net: 2_450,
    });
  });

  it('ignores fully paid debts in planner totals', () => {
    const totals = plannerTotals({
      accounts: [],
      debts: [
        debt({ id: 'paid-receivable', type: 'owed_to_me', totalAmount: 500, paidAmount: 500, status: 'paid' }),
        debt({ id: 'paid-payable', type: 'owed_by_me', totalAmount: 900, paidAmount: 900, status: 'paid' }),
      ],
      planningEntries: [],
      includeExpectedEntries: true,
    });

    expect(totals).toEqual({ positive: 0, negative: 0, net: 0 });
  });

  it('uses actual amounts for confirmed drains when available', () => {
    const totals = plannerTotals({
      accounts: [],
      debts: [],
      planningEntries: [
        planningEntry({ kind: 'negative', status: 'confirmed', expectedAmount: 500, actualAmount: 425 }),
      ],
      includeExpectedEntries: true,
    });

    expect(totals.negative).toBe(425);
    expect(totals.net).toBe(-425);
  });

  it('can exclude expected planning entries without dropping confirmed records', () => {
    const totals = plannerTotals({
      accounts: [],
      debts: [],
      planningEntries: [
        planningEntry({ id: 'confirmed', kind: 'positive', status: 'confirmed', expectedAmount: 500 }),
        planningEntry({ id: 'expected', kind: 'positive', status: 'expected', expectedAmount: 1_000 }),
      ],
      includeExpectedEntries: false,
    });

    expect(totals.positive).toBe(500);
  });

  it('never returns negative remaining debt', () => {
    expect(remainingDebtAmount(debt({ totalAmount: 100, paidAmount: 250 }))).toBe(0);
  });
});

describe('goal progress', () => {
  const goal: Goal = {
    id: 'goal-1',
    name: 'Emergency fund',
    targetAmount: 10_000,
    currentAmount: 0,
    targetDate: '2026-12-31',
    monthlyContribution: 1_000,
    color: '#2D5A3D',
    contributions: [],
    createdAt: '2026-01-01',
  };

  it('clamps progress between 0 and 100 percent', () => {
    expect(goalProgressPercent({ goal, progressAmount: -500 })).toBe(0);
    expect(goalProgressPercent({ goal, progressAmount: 2_499 })).toBe(25);
    expect(goalProgressPercent({ goal, progressAmount: 15_000 })).toBe(100);
  });

  it('returns zero when no valid target exists', () => {
    expect(goalProgressPercent({ goal: null, progressAmount: 1_000 })).toBe(0);
    expect(goalProgressPercent({ goal: { targetAmount: 0 }, progressAmount: 1_000 })).toBe(0);
  });
});
