import { addDays, differenceInCalendarMonths, isAfter, parseISO, startOfDay, subMonths } from 'date-fns';
import type { Category, Goal, Reminder, Transaction } from './types';

export interface MonthlySnapshot {
  month: string;
  previousMonth: string;
  income: number;
  expenses: number;
  net: number;
  previousNet: number;
  netDelta: number;
  savingsRate: number;
  dueSoonTotal: number;
  dueSoonCount: number;
  safeToSpend: number;
}

export interface CategorySpendInsight {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  amount: number;
  previousAmount: number;
  shareOfExpenses: number;
  deltaAmount: number;
}

export interface GoalForecast {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  monthsLeft: number;
  requiredMonthlyContribution: number;
  averageMonthlyContribution: number;
  isOffTrack: boolean;
}

export interface FinancialRecommendation {
  id: string;
  kind: 'spending' | 'obligation' | 'goal' | 'cashflow';
  tone: 'positive' | 'warning' | 'neutral';
  title: string;
  description: string;
}

const DEFAULT_CATEGORY = {
  categoryName: 'Other',
  icon: 'Other',
  color: '#6B655A',
};

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function currentMonthKey(now = new Date()) {
  return monthKey(now);
}

export function previousMonthKey(now = new Date()) {
  return monthKey(subMonths(now, 1));
}

export function buildMonthlySnapshot({
  transactions,
  reminders,
  now = new Date(),
}: {
  transactions: Transaction[];
  reminders: Reminder[];
  now?: Date;
}): MonthlySnapshot {
  const month = currentMonthKey(now);
  const previousMonth = previousMonthKey(now);
  const dueSoonCutoff = addDays(startOfDay(now), 14);

  const income = transactions
    .filter((transaction) => transaction.type === 'income' && transaction.date.startsWith(month))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.date.startsWith(month))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousIncome = transactions
    .filter((transaction) => transaction.type === 'income' && transaction.date.startsWith(previousMonth))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousExpenses = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.date.startsWith(previousMonth))
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const net = income - expenses;
  const previousNet = previousIncome - previousExpenses;

  const dueSoonReminders = reminders.filter((reminder) => {
    if (reminder.status === 'paid') {
      return false;
    }

    const dueDate = parseISO(reminder.dueDate);
    return !isAfter(startOfDay(now), dueDate) && !isAfter(dueDate, dueSoonCutoff);
  });

  const dueSoonTotal = dueSoonReminders.reduce((sum, reminder) => sum + reminder.amount, 0);

  return {
    month,
    previousMonth,
    income,
    expenses,
    net,
    previousNet,
    netDelta: net - previousNet,
    savingsRate: income > 0 ? clampPercent((net / income) * 100) : 0,
    dueSoonTotal,
    dueSoonCount: dueSoonReminders.length,
    safeToSpend: Math.max(0, net - dueSoonTotal),
  };
}

export function buildCategorySpendingInsights({
  transactions,
  categories,
  now = new Date(),
}: {
  transactions: Transaction[];
  categories: Category[];
  now?: Date;
}): CategorySpendInsight[] {
  const month = currentMonthKey(now);
  const previousMonth = previousMonthKey(now);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const currentTotals = new Map<string, number>();
  const previousTotals = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      if (transaction.date.startsWith(month)) {
        currentTotals.set(transaction.categoryId, (currentTotals.get(transaction.categoryId) || 0) + transaction.amount);
      }

      if (transaction.date.startsWith(previousMonth)) {
        previousTotals.set(transaction.categoryId, (previousTotals.get(transaction.categoryId) || 0) + transaction.amount);
      }
    });

  const totalExpenses = [...currentTotals.values()].reduce((sum, amount) => sum + amount, 0);

  return [...currentTotals.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);
      const previousAmount = previousTotals.get(categoryId) || 0;
      return {
        categoryId,
        categoryName: category?.name || DEFAULT_CATEGORY.categoryName,
        icon: category?.icon || DEFAULT_CATEGORY.icon,
        color: category?.color || DEFAULT_CATEGORY.color,
        amount,
        previousAmount,
        shareOfExpenses: totalExpenses > 0 ? amount / totalExpenses : 0,
        deltaAmount: amount - previousAmount,
      };
    })
    .sort((left, right) => right.amount - left.amount);
}

export function buildGoalForecast(goal: Goal, now = new Date()): GoalForecast {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthsLeft = Math.max(1, differenceInCalendarMonths(parseISO(goal.targetDate), now) + 1);
  const requiredMonthlyContribution = remainingAmount > 0 ? remainingAmount / monthsLeft : 0;

  const monthlyContributionMap = new Map<string, number>();
  goal.contributions.forEach((contribution) => {
    const key = contribution.date.slice(0, 7);
    monthlyContributionMap.set(key, (monthlyContributionMap.get(key) || 0) + contribution.amount);
  });

  const averageMonthlyContribution = monthlyContributionMap.size > 0
    ? [...monthlyContributionMap.values()].reduce((sum, amount) => sum + amount, 0) / monthlyContributionMap.size
    : 0;

  return {
    goalId: goal.id,
    goalName: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remainingAmount,
    progressPercent: goal.targetAmount > 0 ? clampPercent((goal.currentAmount / goal.targetAmount) * 100) : 0,
    monthsLeft,
    requiredMonthlyContribution,
    averageMonthlyContribution,
    isOffTrack: remainingAmount > 0 && averageMonthlyContribution < requiredMonthlyContribution,
  };
}

export function buildFinancialRecommendations({
  snapshot,
  categoryInsights,
  goals,
}: {
  snapshot: MonthlySnapshot;
  categoryInsights: CategorySpendInsight[];
  goals: GoalForecast[];
}): FinancialRecommendation[] {
  const recommendations: FinancialRecommendation[] = [];

  if (snapshot.dueSoonCount > 0) {
    recommendations.push({
      id: 'due-soon',
      kind: 'obligation',
      tone: snapshot.safeToSpend <= 0 ? 'warning' : 'neutral',
      title: `${snapshot.dueSoonCount} payment${snapshot.dueSoonCount === 1 ? '' : 's'} coming up`,
      description: `Set aside SAR ${snapshot.dueSoonTotal.toFixed(2)} for the next 14 days so upcoming obligations do not eat into the rest of the month.`,
    });
  }

  const watchCategory = categoryInsights.find((entry) => entry.shareOfExpenses >= 0.28 || entry.deltaAmount >= 500);
  if (watchCategory) {
    recommendations.push({
      id: `category-${watchCategory.categoryId}`,
      kind: 'spending',
      tone: 'warning',
      title: `${watchCategory.categoryName} is driving this month`,
      description: `${watchCategory.categoryName} accounts for ${clampPercent(watchCategory.shareOfExpenses * 100)}% of expenses, up SAR ${watchCategory.deltaAmount.toFixed(2)} from last month.`,
    });
  }

  const offTrackGoal = goals.find((goal) => goal.isOffTrack);
  if (offTrackGoal) {
    recommendations.push({
      id: `goal-${offTrackGoal.goalId}`,
      kind: 'goal',
      tone: 'warning',
      title: `${offTrackGoal.goalName} needs a stronger pace`,
      description: `At the current pace you are below the SAR ${offTrackGoal.requiredMonthlyContribution.toFixed(2)} needed per month to hit the target on time.`,
    });
  } else if (goals[0]) {
    recommendations.push({
      id: `goal-${goals[0].goalId}-healthy`,
      kind: 'goal',
      tone: 'positive',
      title: `${goals[0].goalName} is on track`,
      description: `The current contribution pace supports the target window, with ${goals[0].monthsLeft} month${goals[0].monthsLeft === 1 ? '' : 's'} left.`,
    });
  }

  if (snapshot.net > 0) {
    recommendations.push({
      id: 'cashflow-positive',
      kind: 'cashflow',
      tone: 'positive',
      title: 'You still have room to allocate',
      description: `After this month's expenses you have SAR ${snapshot.safeToSpend.toFixed(2)} that can go toward goals, debt reduction, or a buffer.`,
    });
  } else {
    recommendations.push({
      id: 'cashflow-negative',
      kind: 'cashflow',
      tone: 'warning',
      title: 'Expenses are ahead of income this month',
      description: 'Review discretionary spending and upcoming bills before adding new commitments.',
    });
  }

  return recommendations.slice(0, 4);
}
