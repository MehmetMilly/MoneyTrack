import { Brain, ClockCountdown, TrendDown, TrendUp } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import {
  buildCategorySpendingInsights,
  buildFinancialRecommendations,
  buildGoalForecast,
  buildMonthlySnapshot,
} from '../../lib/data/financialInsights';
import { formatAmount } from '../../lib/utils/currency';
import { formatDateShort } from '../../lib/utils/dates';
import { Card, AmountDisplay, ProgressBar, EmptyState } from '../../components/ui';
import styles from './InsightsPage.module.css';

export default function InsightsPage() {
  const { t, language } = useTranslation();
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const goals = useAppStore((s) => s.goals);
  const reminders = useAppStore((s) => s.reminders);

  const snapshot = useMemo(() => buildMonthlySnapshot({ transactions, reminders }), [transactions, reminders]);
  const categoryInsights = useMemo(
    () => buildCategorySpendingInsights({ transactions, categories }).slice(0, 5),
    [transactions, categories]
  );
  const goalForecasts = useMemo(() => goals.map((goal) => buildGoalForecast(goal)), [goals]);
  const recommendations = useMemo(
    () => buildFinancialRecommendations({ snapshot, categoryInsights, goals: goalForecasts }),
    [snapshot, categoryInsights, goalForecasts]
  );
  const upcomingReminders = reminders
    .filter((reminder) => reminder.status !== 'paid')
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 4);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('insights.title')}</h1>
      <p className={styles.subtitle}>{t('insights.subtitle')}</p>

      <section className={styles.heroGrid}>
        <Card header={t('insights.monthlyCashFlow')}>
          <div className={styles.cashFlow}>
            <div className={`${styles.cashCard} ${styles.incomeCard}`}>
              <span className={styles.cashLabel}>{t('insights.totalIncome')}</span>
              <AmountDisplay amount={snapshot.income} size="md" sign="+" showCurrency />
            </div>
            <div className={`${styles.cashCard} ${styles.expenseCard}`}>
              <span className={styles.cashLabel}>{t('insights.totalExpenses')}</span>
              <AmountDisplay amount={snapshot.expenses} size="md" sign="-" showCurrency />
            </div>
            <div className={`${styles.cashCard} ${styles.netCard}`}>
              <span className={styles.cashLabel}>{t('insights.netSavings')}</span>
              <AmountDisplay amount={Math.abs(snapshot.net)} size="md" sign={snapshot.net >= 0 ? '+' : '-'} showCurrency />
            </div>
          </div>
          <div className={styles.flowFoot}>
            <span>{snapshot.savingsRate}% savings rate</span>
            <span className={snapshot.netDelta >= 0 ? styles.goodDelta : styles.badDelta}>
              {snapshot.netDelta >= 0 ? <TrendUp size={14} /> : <TrendDown size={14} />}
              {snapshot.netDelta >= 0 ? 'SAR ' : '-SAR '}
              {formatAmount(Math.abs(snapshot.netDelta), language)} vs last month
            </span>
          </div>
        </Card>

        <Card header="What should I do next?">
          <div className={styles.recommendationList}>
            {recommendations.map((recommendation) => (
              <article key={recommendation.id} className={`${styles.recommendationRow} ${styles[recommendation.tone]}`}>
                <div className={styles.recommendationIcon}>
                  {recommendation.kind === 'cashflow' ? <Brain size={18} /> : recommendation.kind === 'obligation' ? <ClockCountdown size={18} /> : <TrendUp size={18} />}
                </div>
                <div>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.description}</p>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>

      <div className={styles.analysisGrid}>
        <Card header={t('insights.categorySpending')}>
          <div className={styles.catList}>
            {categoryInsights.length === 0 ? (
              <EmptyState title="No expense categories yet" description="Track a few expenses to see where the month is leaning." />
            ) : categoryInsights.map((category) => (
              <div key={category.categoryId} className={styles.catRow}>
                <span className={styles.catEmoji}>{category.icon}</span>
                <div className={styles.catMeta}>
                  <span className={styles.catName}>{category.categoryName}</span>
                  <span className={styles.catSubtext}>
                    {Math.round(category.shareOfExpenses * 100)}% of expenses
                    {category.deltaAmount !== 0 ? ` | ${category.deltaAmount > 0 ? '+' : '-'}SAR ${formatAmount(Math.abs(category.deltaAmount), language)} vs last month` : ''}
                  </span>
                </div>
                <div className={styles.catBar}>
                  <div className={styles.catFill} style={{ width: `${Math.round(category.shareOfExpenses * 100)}%`, backgroundColor: category.color }} />
                </div>
                <span className={styles.catAmount}>SAR {formatAmount(category.amount, language)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card header="Upcoming cash demands">
          {upcomingReminders.length === 0 ? (
            <EmptyState title="Nothing upcoming" description="Future bills, installments, and reminders will appear here." />
          ) : (
            <div className={styles.timelineList}>
              {upcomingReminders.map((reminder) => (
                <div key={reminder.id} className={styles.timelineRow}>
                  <div>
                    <span className={styles.timelineName}>{reminder.title}</span>
                    <span className={styles.timelineDate}>{formatDateShort(reminder.dueDate, language)}</span>
                  </div>
                  <div className={styles.timelineAmount}>
                    <AmountDisplay amount={reminder.amount} size="sm" showCurrency />
                  </div>
                </div>
              ))}
              <div className={styles.safeSpend}>
                <span>Available after near-term obligations</span>
                <strong>SAR {formatAmount(snapshot.safeToSpend, language)}</strong>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card header={t('insights.goalProgress')}>
        <div className={styles.goalList}>
          {goalForecasts.length === 0 ? (
            <EmptyState title="No goals to forecast yet" description="Add a goal to measure whether your savings pace is realistic." />
          ) : goalForecasts.map((goal) => (
            <div key={goal.goalId} className={styles.goalRow}>
              <div className={styles.goalMain}>
                <span className={styles.goalName}>{goal.goalName}</span>
                <span className={styles.goalHint}>
                  Need SAR {formatAmount(goal.requiredMonthlyContribution, language)} per month
                  {goal.averageMonthlyContribution > 0 ? ` | current pace SAR ${formatAmount(goal.averageMonthlyContribution, language)}` : ''}
                </span>
              </div>
              <ProgressBar value={goal.progressPercent} size="sm" showValue />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
