import type { Account, Debt, Goal, PlanningEntry, Transaction } from './types';

type TransactionLike = Pick<Transaction, 'type' | 'amount' | 'accountId' | 'toAccountId'>;

export function transactionBalanceDelta(transaction: TransactionLike, accountId: string) {
  if (transaction.type === 'income' && transaction.accountId === accountId) {
    return transaction.amount;
  }

  if (transaction.type === 'expense' && transaction.accountId === accountId) {
    return -transaction.amount;
  }

  if (transaction.type === 'transfer') {
    if (transaction.accountId === accountId) {
      return -transaction.amount;
    }

    if (transaction.toAccountId === accountId) {
      return transaction.amount;
    }
  }

  return 0;
}

export function applyTransactionBalance(account: Account, transaction: TransactionLike, direction: 1 | -1 = 1) {
  return account.balance + transactionBalanceDelta(transaction, account.id) * direction;
}

export function remainingDebtAmount(debt: Pick<Debt, 'totalAmount' | 'paidAmount'>) {
  return Math.max(0, debt.totalAmount - debt.paidAmount);
}

export function planningEntryAmount(entry: Pick<PlanningEntry, 'status' | 'actualAmount' | 'expectedAmount'>) {
  if (entry.status === 'cancelled') {
    return 0;
  }

  if (entry.status === 'confirmed' && typeof entry.actualAmount === 'number') {
    return entry.actualAmount;
  }

  return entry.expectedAmount;
}

export function plannerTotals({
  accounts,
  debts,
  planningEntries,
  includeExpectedEntries,
}: {
  accounts: Account[];
  debts: Debt[];
  planningEntries: PlanningEntry[];
  includeExpectedEntries: boolean;
}) {
  const accountAssets = accounts.reduce((sum, account) => sum + account.balance, 0);
  const receivables = debts
    .filter((debt) => debt.type === 'owed_to_me' && debt.status !== 'paid')
    .reduce((sum, debt) => sum + remainingDebtAmount(debt), 0);
  const owedByMe = debts
    .filter((debt) => debt.type === 'owed_by_me' && debt.status !== 'paid')
    .reduce((sum, debt) => sum + remainingDebtAmount(debt), 0);

  const includedEntries = planningEntries.filter((entry) => {
    if (entry.status === 'cancelled') {
      return false;
    }

    return includeExpectedEntries || entry.status !== 'expected';
  });

  const plannerAssets = includedEntries
    .filter((entry) => entry.kind === 'positive')
    .reduce((sum, entry) => sum + planningEntryAmount(entry), 0);
  const plannerDrains = includedEntries
    .filter((entry) => entry.kind === 'negative')
    .reduce((sum, entry) => sum + planningEntryAmount(entry), 0);

  const positive = accountAssets + receivables + plannerAssets;
  const negative = owedByMe + plannerDrains;

  return {
    positive,
    negative,
    net: positive - negative,
  };
}

export function goalProgressPercent({
  goal,
  progressAmount,
}: {
  goal: Pick<Goal, 'targetAmount'> | null;
  progressAmount: number;
}) {
  if (!goal || goal.targetAmount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((progressAmount / goal.targetAmount) * 100)));
}
