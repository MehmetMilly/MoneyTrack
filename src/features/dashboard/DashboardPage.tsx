import { Link } from 'react-router-dom';
import { CheckCircle, Plus, Target, TrendDown, TrendUp, Wallet } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { formatAmount } from '../../lib/utils/currency';
import { formatDateShort } from '../../lib/utils/dates';
import { Card, AmountDisplay, ProgressBar, Badge, Button, EmptyState } from '../../components/ui';
import styles from './DashboardPage.module.css';
import type { PlanningEntry } from '../../lib/data/types';

function effectiveAmount(entry: PlanningEntry) {
  if (entry.status === 'cancelled') return 0;
  if (entry.status === 'confirmed' && typeof entry.actualAmount === 'number') return entry.actualAmount;
  return entry.expectedAmount;
}

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const planningEntries = useAppStore((s) => s.planningEntries);
  const goals = useAppStore((s) => s.goals);
  const plannerSettings = useAppStore((s) => s.settings.planner);
  const getPlannerPositiveTotal = useAppStore((s) => s.getPlannerPositiveTotal);
  const getPlannerNegativeTotal = useAppStore((s) => s.getPlannerNegativeTotal);
  const getPlannerNetTotal = useAppStore((s) => s.getPlannerNetTotal);
  const markPlanningEntryConfirmed = useAppStore((s) => s.markPlanningEntryConfirmed);
  const markPlanningEntryCancelled = useAppStore((s) => s.markPlanningEntryCancelled);
  const deletePlanningEntry = useAppStore((s) => s.deletePlanningEntry);
  const loading = useAppStore((s) => s.loading.planning);
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({});

  const primaryGoal = goals.find((goal) => goal.id === plannerSettings.primaryGoalId) || goals[0] || null;
  const positiveTotal = getPlannerPositiveTotal();
  const negativeTotal = getPlannerNegativeTotal();
  const netTotal = getPlannerNetTotal();
  const goalProgressAmount = plannerSettings.goalProgressMode === 'manual_contributions'
    ? primaryGoal?.currentAmount || 0
    : netTotal;
  const progressPercent = primaryGoal && primaryGoal.targetAmount > 0
    ? Math.max(0, Math.min(100, Math.round((goalProgressAmount / primaryGoal.targetAmount) * 100)))
    : 0;
  const remaining = primaryGoal ? Math.max(0, primaryGoal.targetAmount - goalProgressAmount) : 0;
  const activeEntries = planningEntries.filter((entry) => entry.status !== 'cancelled');
  const positiveEntries = activeEntries.filter((entry) => entry.kind === 'positive');
  const negativeEntries = activeEntries.filter((entry) => entry.kind === 'negative');
  const pendingEntries = activeEntries.filter((entry) => entry.status === 'expected');
  const confirmedPositiveTotal = positiveEntries
    .filter((entry) => entry.status === 'confirmed')
    .reduce((sum, entry) => sum + effectiveAmount(entry), 0);
  const expectedPositiveTotal = positiveEntries
    .filter((entry) => entry.status === 'expected')
    .reduce((sum, entry) => sum + effectiveAmount(entry), 0);

  const handleConfirm = async (entry: PlanningEntry, actualAmount?: string) => {
    const amount = parseFloat(actualAmount || String(entry.expectedAmount));
    if (!Number.isFinite(amount)) return;

    try {
      await markPlanningEntryConfirmed(entry.id, amount);
    } catch {
      // Store error surfaces on entries page; dashboard keeps the common path quiet.
    }
  };

  const renderEntry = (entry: PlanningEntry) => (
    <div key={entry.id} className={styles.entryRow}>
      <div className={styles.entryMain}>
        <span className={`${styles.entryDot} ${entry.kind === 'positive' ? styles.positiveDot : styles.negativeDot}`} />
        <div>
          <span className={styles.entryTitle}>{entry.title}</span>
          <span className={styles.entryMeta}>
            {entry.category.replaceAll('_', ' ')}
            {entry.dueDate ? ` · ${formatDateShort(entry.dueDate, language)}` : ''}
          </span>
        </div>
      </div>
      <div className={styles.entryAmount}>
        <AmountDisplay amount={effectiveAmount(entry)} size="sm" sign={entry.kind === 'positive' ? '+' : '-'} showCurrency />
        <Badge variant={entry.status === 'confirmed' ? 'paid' : 'upcoming'} stamp>
          {t(`planner.${entry.status}` as 'planner.expected')}
        </Badge>
        {entry.status === 'confirmed' && entry.actualAmount !== undefined && entry.actualAmount !== entry.expectedAmount && (
          <span className={styles.entryMeta}>{t('planner.expectedWas', { amount: formatAmount(entry.expectedAmount, language) })}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{t('planner.dashboardKicker')}</p>
          <h1 className={styles.greeting}>{primaryGoal?.name || t('planner.noPrimaryGoal')}</h1>
          <p className={styles.subtitle}>{t('planner.dashboardSubtitle')}</p>
        </div>
        <div className={styles.quickActions}>
          <Link to="/goals" className={styles.secondaryLink}>{t('planner.chooseGoal')}</Link>
          <Link to="/transactions/new" className={styles.addBtn}>
            <Plus size={18} weight="bold" />
            <span>{t('planner.addPlannerEntry')}</span>
          </Link>
        </div>
      </header>

      <section className={`${styles.hero} fade-in`}>
        <div className={styles.heroCopy}>
          <div className={styles.heroIcon}><Target size={28} weight="duotone" /></div>
          <div>
            <span className={styles.metricLabel}>{t('planner.primaryGoal')}</span>
            <h2>{primaryGoal?.name || t('planner.createPrimaryGoal')}</h2>
            <p>
              {primaryGoal
                ? `${t('goals.targetAmount')}: SAR ${formatAmount(primaryGoal.targetAmount, language)} · ${t('goals.targetDate')}: ${formatDateShort(primaryGoal.targetDate, language)}`
                : t('planner.createGoalHint')}
            </p>
          </div>
        </div>
        <div className={styles.heroNumbers}>
          <span className={styles.heroPct}>{progressPercent}%</span>
          <ProgressBar value={progressPercent} color={primaryGoal?.color || 'var(--color-accent)'} size="lg" />
          <div className={styles.heroAmounts}>
            <span>{t('planner.totalPositiveMoney')}</span>
            <AmountDisplay amount={positiveTotal} size="md" showCurrency />
          </div>
          <div className={styles.heroAmounts}>
            <span>{t('planner.projectedNet')}</span>
            <AmountDisplay amount={Math.abs(netTotal)} size="md" sign={netTotal >= 0 ? '+' : '-'} showCurrency />
          </div>
          <div className={styles.heroAmounts}>
            <span>{remaining <= 0 ? t('planner.fullyFunded') : t('planner.remainingNeeded')}</span>
            <AmountDisplay amount={remaining} size="md" showCurrency />
          </div>
          <p className={styles.statusText}>{remaining <= 0 ? t('planner.fullyFunded') : t('planner.needsMore', { amount: formatAmount(remaining, language) })}</p>
        </div>
      </section>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <TrendUp size={20} color="var(--color-success)" />
          <span className={styles.metricLabel}>{t('planner.confirmedPositives')}</span>
          <AmountDisplay amount={confirmedPositiveTotal} size="md" showCurrency />
        </div>
        <div className={styles.metricCard}>
          <Wallet size={20} color="var(--color-info)" />
          <span className={styles.metricLabel}>{t('planner.expectedPositives')}</span>
          <AmountDisplay amount={expectedPositiveTotal} size="md" showCurrency />
        </div>
        <div className={styles.metricCard}>
          <TrendDown size={20} color="var(--color-danger)" />
          <span className={styles.metricLabel}>{t('planner.negativeEntries')}</span>
          <AmountDisplay amount={negativeTotal} size="md" sign="-" showCurrency />
        </div>
        <div className={`${styles.metricCard} ${styles.netMetric}`}>
          <CheckCircle size={20} color="var(--color-accent)" />
          <span className={styles.metricLabel}>{t('planner.projectedTowardGoal')}</span>
          <AmountDisplay amount={Math.abs(netTotal)} size="md" sign={netTotal >= 0 ? '+' : '-'} showCurrency />
        </div>
      </div>

      <div className={styles.grid}>
        <Card header={t('planner.positiveEntries')} headerAction={<Link to="/transactions/new?kind=positive" className={styles.viewAll}>{t('common.add')}</Link>}>
          <div className={styles.entryList}>
            {positiveEntries.length === 0 ? <p className={styles.noData}>{t('planner.noPositiveEntries')}</p> : positiveEntries.slice(0, 5).map(renderEntry)}
          </div>
        </Card>

        <Card header={t('planner.negativeEntries')} headerAction={<Link to="/transactions/new?kind=negative" className={styles.viewAll}>{t('common.add')}</Link>}>
          <div className={styles.entryList}>
            {negativeEntries.length === 0 ? <p className={styles.noData}>{t('planner.noNegativeEntries')}</p> : negativeEntries.slice(0, 5).map(renderEntry)}
          </div>
        </Card>

        <Card header={t('planner.pendingExpectedEntries')} className={styles.pendingCard}>
          <div className={styles.entryList}>
            {pendingEntries.length === 0 && (
              <EmptyState icon={<CheckCircle size={42} weight="thin" />} title={t('planner.noPendingTitle')} description={t('planner.noPendingDescription')} />
            )}
            {pendingEntries.map((entry) => (
              <div key={entry.id} className={styles.pendingRow}>
                {renderEntry(entry)}
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
        </Card>

        <Card header={t('planner.quickAdd')} className={styles.quickCard}>
          <div className={styles.quickGrid}>
            <Link to="/goals" className={styles.quickTile}>{t('planner.createGoal')}</Link>
            <Link to="/transactions/new?kind=positive" className={styles.quickTile}>{t('planner.addPositive')}</Link>
            <Link to="/transactions/new?kind=negative" className={styles.quickTile}>{t('planner.addNegative')}</Link>
            <Link to="/transactions" className={styles.quickTile}>{t('planner.reviewEntries')}</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
