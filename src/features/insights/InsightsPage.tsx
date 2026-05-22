import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { formatAmount } from '../../lib/utils/currency';
import { Card, AmountDisplay, ProgressBar } from '../../components/ui';
import styles from './InsightsPage.module.css';

export default function InsightsPage() {
  const { t, language } = useTranslation();
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const goals = useAppStore((s) => s.goals);
  const reminders = useAppStore((s) => s.reminders);
  const getMonthlyIncome = useAppStore((s) => s.getMonthlyIncome);
  const getMonthlyExpenses = useAppStore((s) => s.getMonthlyExpenses);

  const income = getMonthlyIncome();
  const expenses = getMonthlyExpenses();
  const net = income - expenses;
  const curr = 'SAR';
  const thisMonth = new Date().toISOString().slice(0, 7);

  const monthExpenses = transactions.filter((transaction) => transaction.type === 'expense' && transaction.date.startsWith(thisMonth));
  const categoryTotals = new Map<string, number>();
  monthExpenses.forEach((transaction) => {
    categoryTotals.set(transaction.categoryId, (categoryTotals.get(transaction.categoryId) || 0) + transaction.amount);
  });

  const topCategories = [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([id, amount]) => ({ category: categories.find((entry) => entry.id === id), amount }));
  const maxCategoryAmount = topCategories[0]?.amount || 1;

  const monthlyBurden = reminders
    .filter((reminder) => reminder.status !== 'paid' && reminder.dueDate.startsWith(thisMonth))
    .reduce((sum, reminder) => sum + reminder.amount, 0);
  const burdenPct = income > 0 ? Math.round((monthlyBurden / income) * 100) : 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('insights.title')}</h1>
      <p className={styles.subtitle}>{t('insights.subtitle')}</p>

      <Card header={t('insights.monthlyCashFlow')}>
        <div className={styles.cashFlow}>
          <div className={`${styles.cashCard} ${styles.incomeCard}`}>
            <span className={styles.cashLabel}>{t('insights.totalIncome')}</span>
            <AmountDisplay amount={income} size="md" sign="+" showCurrency />
          </div>
          <div className={`${styles.cashCard} ${styles.expenseCard}`}>
            <span className={styles.cashLabel}>{t('insights.totalExpenses')}</span>
            <AmountDisplay amount={expenses} size="md" sign="-" showCurrency />
          </div>
          <div className={`${styles.cashCard} ${styles.netCard}`}>
            <span className={styles.cashLabel}>{t('insights.netSavings')}</span>
            <AmountDisplay amount={Math.abs(net)} size="md" sign={net >= 0 ? '+' : '-'} showCurrency />
          </div>
        </div>
        <div className={styles.flowBar}>
          <div className={styles.flowIncome} style={{ width: `${income > 0 ? 100 : 0}%` }} />
          <div className={styles.flowExpense} style={{ width: `${income > 0 ? (expenses / income) * 100 : 0}%` }} />
        </div>
      </Card>

      <Card header={t('insights.categorySpending')}>
        <div className={styles.catList}>
          {topCategories.map(({ category, amount }) => (
            <div key={category?.id || 'unknown'} className={styles.catRow}>
              <span className={styles.catEmoji}>{category?.icon || 'Other'}</span>
              <span className={styles.catName}>{language === 'ar' ? category?.nameAr : category?.name}</span>
              <div className={styles.catBar}>
                <div className={styles.catFill} style={{ width: `${(amount / maxCategoryAmount) * 100}%`, backgroundColor: category?.color }} />
              </div>
              <span className={styles.catAmount}>{curr} {formatAmount(amount, language)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card header={t('insights.goalProgress')}>
        <div className={styles.goalList}>
          {goals.map((goal) => {
            const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            return (
              <div key={goal.id} className={styles.goalRow}>
                <span className={styles.goalIcon}>{goal.icon}</span>
                <span className={styles.goalName}>{goal.name}</span>
                <ProgressBar value={percent} color={goal.color} size="sm" showValue />
              </div>
            );
          })}
        </div>
      </Card>

      <Card header={t('insights.debtBurden')}>
        <div className={styles.burdenSection}>
          <div>
            <span className={styles.burdenLabel}>{t('insights.monthlyBurden')}</span>
            <AmountDisplay amount={monthlyBurden} size="lg" showCurrency />
          </div>
          <div className={styles.burdenPct}>
            <span className={styles.burdenNum}>{burdenPct}%</span>
            <span className={styles.burdenOf}>{t('insights.percentOfIncome', { percent: String(burdenPct) })}</span>
          </div>
        </div>
        <ProgressBar value={burdenPct} color={burdenPct > 50 ? 'var(--color-danger)' : burdenPct > 30 ? 'var(--color-warning)' : 'var(--color-success)'} size="lg" />
      </Card>
    </div>
  );
}

