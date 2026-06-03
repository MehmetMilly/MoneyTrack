import { Link } from 'react-router-dom';
import {
  ArrowCircleDown,
  ArrowCircleUp,
  CheckCircle,
  Clock,
  Coins,
  Plus,
  Sparkle,
  Target,
  TrendDown,
  TrendUp,
  WarningCircle,
} from '@phosphor-icons/react';
import { useState } from 'react';
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
import { AmountDisplay, Button, EmptyState } from '../../components/ui';
import styles from './DashboardPage.module.css';
import type { Debt, PlanningEntry } from '../../lib/data/types';

type LedgerItem = {
  id: string;
  title: string;
  meta: string;
  amount: number;
  status: PlanningEntry['status'] | 'available';
  kind: 'asset' | 'drain';
  entry?: PlanningEntry;
};

function effectiveAmount(entry: PlanningEntry) {
  if (entry.status === 'cancelled') return 0;
  if (entry.status === 'confirmed' && typeof entry.actualAmount === 'number') return entry.actualAmount;
  return entry.expectedAmount;
}

function debtRemaining(debt: Debt) {
  return Math.max(0, debt.totalAmount - debt.paidAmount);
}

function categoryLabel(value: string) {
  return value.replaceAll('_', ' ');
}

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const accounts = useAppStore((s) => s.accounts);
  const debts = useAppStore((s) => s.debts);
  const planningEntries = useAppStore((s) => s.planningEntries);
  const goals = useAppStore((s) => s.goals);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const reminders = useAppStore((s) => s.reminders);
  const plannerSettings = useAppStore((s) => s.settings.planner);
  const positiveTotal = useAppStore((s) => s.getPlannerPositiveTotal)();
  const negativeTotal = useAppStore((s) => s.getPlannerNegativeTotal)();
  const netTotal = useAppStore((s) => s.getPlannerNetTotal)();
  const markPlanningEntryConfirmed = useAppStore((s) => s.markPlanningEntryConfirmed);
  const markPlanningEntryCancelled = useAppStore((s) => s.markPlanningEntryCancelled);
  const deletePlanningEntry = useAppStore((s) => s.deletePlanningEntry);
  const loading = useAppStore((s) => s.loading.planning);
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({});

  const primaryGoal = goals.find((goal) => goal.id === plannerSettings.primaryGoalId) || goals[0] || null;
  const snapshot = buildMonthlySnapshot({ transactions, reminders });
  const categoryInsights = buildCategorySpendingInsights({ transactions, categories });
  const goalForecasts = goals.map((goal) => buildGoalForecast(goal));
  const recommendations = buildFinancialRecommendations({
    snapshot,
    categoryInsights,
    goals: goalForecasts,
  });
  const goalProgressAmount = primaryGoal?.currentAmount || 0;
  const progressPercent = primaryGoal && primaryGoal.targetAmount > 0
    ? Math.max(0, Math.min(100, Math.round((goalProgressAmount / primaryGoal.targetAmount) * 100)))
    : 0;
  const remaining = primaryGoal ? Math.max(0, primaryGoal.targetAmount - goalProgressAmount) : 0;
  const activeEntries = planningEntries.filter((entry) => entry.status !== 'cancelled');
  const pendingEntries = activeEntries.filter((entry) => entry.status === 'expected');
  const confirmedPlannerAssets = activeEntries
    .filter((entry) => entry.kind === 'positive' && entry.status === 'confirmed')
    .reduce((sum, entry) => sum + effectiveAmount(entry), 0);
  const expectedPlannerAssets = activeEntries
    .filter((entry) => entry.kind === 'positive' && entry.status === 'expected')
    .reduce((sum, entry) => sum + effectiveAmount(entry), 0);
  const accountAssets = accounts.reduce((sum, account) => sum + account.balance, 0);
  const receivables = debts
    .filter((debt) => debt.type === 'owed_to_me' && debt.status !== 'paid')
    .reduce((sum, debt) => sum + debtRemaining(debt), 0);
  const confirmedAssets = accountAssets + confirmedPlannerAssets;
  const expectedAssets = receivables + expectedPlannerAssets;
  const topCategory = categoryInsights[0];
  const primaryGoalForecast = primaryGoal ? goalForecasts.find((goal) => goal.goalId === primaryGoal.id) || null : null;

  const assetItems: LedgerItem[] = [
    ...accounts.map((account) => ({
      id: `account-${account.id}`,
      title: account.name,
      meta: t(`accounts.${account.type}` as 'accounts.bank'),
      amount: account.balance,
      status: 'available' as const,
      kind: 'asset' as const,
    })),
    ...debts
      .filter((debt) => debt.type === 'owed_to_me' && debt.status !== 'paid')
      .map((debt) => ({
        id: `debt-${debt.id}`,
        title: debt.name,
        meta: t('debts.owedToMe'),
        amount: debtRemaining(debt),
        status: 'expected' as const,
        kind: 'asset' as const,
      })),
    ...activeEntries
      .filter((entry) => entry.kind === 'positive')
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        meta: `${categoryLabel(entry.category)}${entry.dueDate ? ` - ${formatDateShort(entry.dueDate, language)}` : ''}`,
        amount: effectiveAmount(entry),
        status: entry.status,
        kind: 'asset' as const,
        entry,
      })),
  ];

  const drainItems: LedgerItem[] = [
    ...debts
      .filter((debt) => debt.type === 'owed_by_me' && debt.status !== 'paid')
      .map((debt) => ({
        id: `debt-${debt.id}`,
        title: debt.name,
        meta: t('debts.owedByMe'),
        amount: debtRemaining(debt),
        status: 'expected' as const,
        kind: 'drain' as const,
      })),
    ...activeEntries
      .filter((entry) => entry.kind === 'negative')
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        meta: `${categoryLabel(entry.category)}${entry.dueDate ? ` - ${formatDateShort(entry.dueDate, language)}` : ''}`,
        amount: effectiveAmount(entry),
        status: entry.status,
        kind: 'drain' as const,
        entry,
      })),
  ];

  const handleConfirm = async (entry: PlanningEntry, actualAmount?: string) => {
    const amount = parseFloat(actualAmount || String(entry.expectedAmount));
    if (!Number.isFinite(amount)) return;

    try {
      await markPlanningEntryConfirmed(entry.id, amount);
      setActualInputs((current) => ({ ...current, [entry.id]: '' }));
    } catch {
      // Error state is available on the full entries page.
    }
  };

  const renderLedgerItem = (item: LedgerItem, index: number) => (
    <div key={item.id} className={`${styles.ledgerRow} ${styles[item.kind]} slide-up stagger-${Math.min(index + 1, 8)}`}>
      <span className={styles.rowMark} />
      <div className={styles.rowCopy}>
        <span className={styles.rowTitle}>{item.title}</span>
        <span className={styles.rowMeta}>{item.meta}</span>
      </div>
      <div className={styles.rowAmount}>
        <AmountDisplay amount={item.amount} size="sm" sign={item.kind === 'asset' ? '+' : '-'} showCurrency />
        <span className={`${styles.statusPill} ${styles[item.status]}`}>
          {item.status === 'available' ? t('planner.available') : t(`planner.${item.status}` as 'planner.expected')}
        </span>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <section className={`${styles.commandSurface} fade-in`}>
        <div className={styles.goalPane}>
          <div className={styles.goalTopline}>
            <Target size={22} weight="duotone" />
            <span>{t('planner.primaryGoal')}</span>
          </div>
          <h1>{primaryGoal?.name || t('planner.noPrimaryGoal')}</h1>
          <div className={styles.goalMeta}>
            <span>{primaryGoal ? `${t('goals.targetAmount')}: SAR ${formatAmount(primaryGoal.targetAmount, language)}` : t('planner.createGoalHint')}</span>
            {primaryGoal && <span>{t('goals.targetDate')}: {formatDateShort(primaryGoal.targetDate, language)}</span>}
          </div>
          <div className={styles.actionRail} aria-label={t('planner.quickAdd')}>
            <Link to="/transactions/new?kind=positive"><ArrowCircleUp size={18} />{t('planner.addAsset')}</Link>
            <Link to="/transactions/new?kind=negative"><ArrowCircleDown size={18} />{t('planner.addDrain')}</Link>
            <Link to="/goals"><Target size={18} />{t('planner.chooseGoal')}</Link>
          </div>
        </div>

        <div className={styles.progressPane}>
          <div className={styles.progressNumber}>
            <span>{progressPercent}</span>
            <em>%</em>
          </div>
          <div className={styles.progressTrack} aria-label={`${progressPercent}%`}>
            <span style={{ inlineSize: `${progressPercent}%`, backgroundColor: primaryGoal?.color || undefined }} />
          </div>
          <div className={styles.remainingBlock}>
            <span>{!primaryGoal ? t('planner.noPrimaryGoal') : remaining <= 0 ? t('planner.fullyFunded') : t('goals.savedSoFar')}</span>
            {primaryGoal && <strong>SAR {formatAmount(goalProgressAmount, language)}</strong>}
          </div>
          <div className={styles.remainingBlock}>
            <span>{!primaryGoal ? t('planner.noPrimaryGoal') : remaining <= 0 ? t('planner.fullyFunded') : t('planner.remainingNeeded')}</span>
            <AmountDisplay amount={remaining} size="lg" showCurrency />
          </div>
        </div>

        <div className={styles.netPane}>
          <div>
            <span>{t('planner.projectedNet')}</span>
            <AmountDisplay amount={Math.abs(netTotal)} size="lg" sign={netTotal >= 0 ? '+' : '-'} showCurrency />
          </div>
          <dl>
            <div>
              <dt>{t('planner.totalAssets')}</dt>
              <dd>SAR {formatAmount(positiveTotal, language)}</dd>
            </div>
            <div>
              <dt>{t('planner.totalDrains')}</dt>
              <dd>SAR {formatAmount(negativeTotal, language)}</dd>
            </div>
            <div>
              <dt>{t('planner.pendingExpectedEntries')}</dt>
              <dd>{pendingEntries.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.focusStrip}>
        <article className={styles.focusCard}>
          <div className={styles.focusHeader}>
            <span>Month net</span>
            {snapshot.netDelta >= 0 ? <TrendUp size={16} /> : <TrendDown size={16} />}
          </div>
          <strong><AmountDisplay amount={Math.abs(snapshot.net)} size="md" sign={snapshot.net >= 0 ? '+' : '-'} showCurrency /></strong>
          <p>
            {snapshot.netDelta === 0
              ? 'In line with last month.'
              : `${snapshot.netDelta > 0 ? 'Up' : 'Down'} SAR ${formatAmount(Math.abs(snapshot.netDelta), language)} versus last month.`}
          </p>
        </article>
        <article className={styles.focusCard}>
          <div className={styles.focusHeader}>
            <span>Spending pressure</span>
            <WarningCircle size={16} />
          </div>
          <strong>{topCategory ? topCategory.categoryName : 'No expense data yet'}</strong>
          <p>
            {topCategory
              ? `${Math.round(topCategory.shareOfExpenses * 100)}% of this month's expenses, SAR ${formatAmount(topCategory.amount, language)} total.`
              : 'Add expenses to see what is taking the biggest share of your month.'}
          </p>
        </article>
        <article className={styles.focusCard}>
          <div className={styles.focusHeader}>
            <span>Goal pace</span>
            <Sparkle size={16} />
          </div>
          <strong>{primaryGoalForecast ? `${primaryGoalForecast.progressPercent}% funded` : 'No primary goal selected'}</strong>
          <p>
            {primaryGoalForecast
              ? `${primaryGoalForecast.isOffTrack ? 'Needs' : 'Holding'} SAR ${formatAmount(primaryGoalForecast.requiredMonthlyContribution, language)} per month to land on time.`
              : 'Pick a goal to see whether your current plan is enough.'}
          </p>
        </article>
      </section>

      <section className={styles.assetStrip}>
        <div>
          <Coins size={18} />
          <span>{t('planner.confirmedAssets')}</span>
          <strong>SAR {formatAmount(confirmedAssets, language)}</strong>
        </div>
        <div>
          <Clock size={18} />
          <span>{t('planner.expectedAssets')}</span>
          <strong>SAR {formatAmount(expectedAssets, language)}</strong>
        </div>
        <div>
          <ArrowCircleDown size={18} />
          <span>{t('planner.negativeEntries')}</span>
          <strong>SAR {formatAmount(negativeTotal, language)}</strong>
        </div>
      </section>

      <section className={styles.recommendationPanel}>
        <div className={styles.sectionHead}>
          <h2>What deserves attention</h2>
          <span>Updated from your latest entries and obligations</span>
        </div>
        <div className={styles.recommendationGrid}>
          {recommendations.map((recommendation, index) => (
            <article
              key={recommendation.id}
              className={`${styles.recommendationCard} ${styles[recommendation.tone]} slide-up stagger-${Math.min(index + 1, 4)}`}
            >
              <span className={styles.recommendationKind}>{recommendation.kind}</span>
              <h3>{recommendation.title}</h3>
              <p>{recommendation.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.workbench}>
        <section className={styles.ledgerPanel}>
          <div className={styles.sectionHead}>
            <h2>{t('planner.assets')}</h2>
            <Link to="/transactions/new?kind=positive"><Plus size={16} />{t('common.add')}</Link>
          </div>
          <div className={styles.ledgerList}>
            {assetItems.length === 0
              ? <p className={styles.noData}>{t('planner.noAssetEntries')}</p>
              : assetItems.slice(0, 8).map(renderLedgerItem)}
          </div>
        </section>

        <section className={styles.ledgerPanel}>
          <div className={styles.sectionHead}>
            <h2>{t('planner.drains')}</h2>
            <Link to="/transactions/new?kind=negative"><Plus size={16} />{t('common.add')}</Link>
          </div>
          <div className={styles.ledgerList}>
            {drainItems.length === 0
              ? <p className={styles.noData}>{t('planner.noDrainEntries')}</p>
              : drainItems.slice(0, 8).map(renderLedgerItem)}
          </div>
        </section>
      </div>

      <section className={styles.pendingPanel}>
        <div className={styles.sectionHead}>
          <h2>{t('planner.pendingExpectedEntries')}</h2>
          <Link to="/transactions">{t('planner.reviewEntries')}</Link>
        </div>
        {pendingEntries.length === 0 ? (
          <EmptyState icon={<CheckCircle size={42} weight="thin" />} title={t('planner.noPendingTitle')} description={t('planner.noPendingDescription')} />
        ) : (
          <div className={styles.pendingList}>
            {pendingEntries.map((entry, index) => (
              <div key={entry.id} className={`${styles.pendingRow} slide-up stagger-${Math.min(index + 1, 8)}`}>
                <div className={styles.pendingMain}>
                  <span className={`${styles.rowMark} ${entry.kind === 'positive' ? styles.asset : styles.drain}`} />
                  <div className={styles.rowCopy}>
                    <span className={styles.rowTitle}>{entry.title}</span>
                    <span className={styles.rowMeta}>
                      {categoryLabel(entry.category)}
                      {entry.dueDate ? ` - ${formatDateShort(entry.dueDate, language)}` : ''}
                    </span>
                  </div>
                  <AmountDisplay amount={effectiveAmount(entry)} size="sm" sign={entry.kind === 'positive' ? '+' : '-'} showCurrency />
                </div>
                <div className={styles.pendingActions}>
                  <input
                    className={styles.actualInput}
                    aria-label={`${t('planner.actualAmount')} ${entry.title}`}
                    type="number"
                    placeholder={String(entry.expectedAmount)}
                    value={actualInputs[entry.id] || ''}
                    onChange={(event) => setActualInputs((current) => ({ ...current, [entry.id]: event.target.value }))}
                  />
                  <Button size="sm" variant="secondary" onClick={() => handleConfirm(entry)} loading={loading}>{t('planner.markConfirmed')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleConfirm(entry, actualInputs[entry.id])} disabled={loading}>{t('planner.confirmActual')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => markPlanningEntryCancelled(entry.id)} disabled={loading}>{t('planner.cancelEntry')}</Button>
                  <Button size="sm" variant="danger" onClick={() => deletePlanningEntry(entry.id)} disabled={loading}>{t('common.delete')}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
