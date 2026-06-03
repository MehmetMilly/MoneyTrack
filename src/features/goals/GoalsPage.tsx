import { Link } from 'react-router-dom';
import { Plus, Sparkle, Target } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { buildGoalForecast } from '../../lib/data/financialInsights';
import { formatAmount } from '../../lib/utils/currency';
import { Button, Input, ProgressBar, EmptyState } from '../../components/ui';
import styles from './GoalsPage.module.css';

const presetIcons = ['🎯', '🏠', '🚗', '✈️', '💻', '📚', '💰', '🎁', '🛟', '🏥'];
const presetColors = ['#2D5A3D', '#3B6B96', '#B8860B', '#6B5B95', '#8B7E6A', '#C4314B', '#D4A843', '#5BA87A'];

function endOfNextMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 2, 0);
  return date.toISOString().split('T')[0];
}

export default function GoalsPage() {
  const { t, language } = useTranslation();
  const goals = useAppStore((s) => s.goals);
  const addGoal = useAppStore((s) => s.addGoal);
  const setPrimaryGoal = useAppStore((s) => s.setPrimaryGoal);
  const primaryGoalId = useAppStore((s) => s.settings.planner.primaryGoalId);
  const loading = useAppStore((s) => s.loading.goals);
  const error = useAppStore((s) => s.errors.goals);
  const clearError = useAppStore((s) => s.clearError);

  const curr = 'SAR';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: endOfNextMonth(),
    icon: '🎯',
    color: '#2D5A3D',
  });

  const resetForm = () => {
    setForm({
      name: '',
      targetAmount: '',
      targetDate: endOfNextMonth(),
      icon: '🎯',
      color: '#2D5A3D',
    });
  };

  const handleAdd = async () => {
    clearError('goals');
    if (!form.name || !form.targetAmount) {
      return;
    }

    try {
      await addGoal({
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        monthlyContribution: 0,
        targetDate: form.targetDate || endOfNextMonth(),
        icon: form.icon,
        color: form.color,
        initialDeposit: 0,
      });
      resetForm();
      setShowForm(false);
    } catch {
      // Error is handled by store and displayed.
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('goals.title')}</h1>
          <p className={styles.subtitle}>{t('goals.subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(true)} iconLeft={<Plus size={16} />}>{t('goals.addGoal')}</Button>
      </header>

      {showForm && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <div className={`${styles.formModal} slide-up`} role="dialog" aria-modal="true" aria-labelledby="add-goal-title">
            <div className={styles.modalHeader}>
              <h3 id="add-goal-title" className={styles.formTitle}>{t('goals.addGoal')}</h3>
              <button className={styles.closeBtn} type="button" onClick={() => setShowForm(false)} aria-label={t('common.close')}>x</button>
            </div>
            <div className={styles.formGrid}>
              <Input label={t('goals.goalName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Demo Laptop Fund" />
              <Input label={t('goals.targetAmount')} type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="0.00" />
              <Input label={t('goals.targetDate')} type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />

              <div>
                <label className={styles.fieldLabel}>Icon</label>
                <div className={styles.iconGrid}>
                  {presetIcons.map((ic) => (
                    <button key={ic} type="button" className={`${styles.iconBtn} ${form.icon === ic ? styles.iconActive : ''}`} onClick={() => setForm({ ...form, icon: ic })}>{ic}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className={styles.fieldLabel}>Color</label>
                <div className={styles.colorRow}>
                  {presetColors.map((c) => (
                    <button key={c} type="button" className={`${styles.colorDot} ${form.color === c ? styles.colorActive : ''}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />
                  ))}
                </div>
              </div>
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            <div className={styles.formActions}>
              <Button variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleAdd} loading={loading}>{t('common.save')}</Button>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState icon="🎯" title={t('goals.emptyTitle')} description={t('goals.emptyDescription')} action={<Button onClick={() => setShowForm(true)} iconLeft={<Plus size={16} />}>{t('goals.addGoal')}</Button>} />
      ) : (
        <>
          <section className={styles.summaryRail}>
            {goals.slice(0, 3).map((goal) => {
              const forecast = buildGoalForecast(goal);
              return (
                <article key={goal.id} className={styles.summaryCard}>
                  <div className={styles.summaryTop}>
                    <span>{forecast.goalName}</span>
                    {forecast.isOffTrack ? <Sparkle size={16} /> : <Target size={16} />}
                  </div>
                  <strong>{forecast.progressPercent}% funded</strong>
                  <p>
                    {forecast.isOffTrack
                      ? `Needs SAR ${formatAmount(forecast.requiredMonthlyContribution, language)} per month to recover pace.`
                      : `On pace with ${forecast.monthsLeft} month${forecast.monthsLeft === 1 ? '' : 's'} left.`}
                  </p>
                </article>
              );
            })}
          </section>

          <div className={styles.grid}>
            {goals.map((goal, i) => {
              const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
              const forecast = buildGoalForecast(goal);
              return (
                <Link to={`/goals/${goal.id}`} key={goal.id} className={`${styles.card} slide-up stagger-${i + 1}`}>
                  <div className={styles.cardTop}>
                    <span className={styles.icon}>{goal.icon}</span>
                    <div className={styles.cardBadges}>
                      {primaryGoalId === goal.id && <span className={styles.primaryBadge}>Primary goal</span>}
                      <span className={styles.pct} style={{ color: goal.color }}>{pct}%</span>
                    </div>
                  </div>
                  <h3 className={styles.goalName}>{goal.name}</h3>
                  <ProgressBar value={pct} color={goal.color} size="md" />
                  <div className={styles.amounts}>
                    <span>{curr} {formatAmount(goal.currentAmount, language)}</span>
                    <span className={styles.target}>of {curr} {formatAmount(goal.targetAmount, language)}</span>
                  </div>
                  <div className={styles.remaining}>
                    {t('goals.remainingAmount')}: {curr} {formatAmount(goal.targetAmount - goal.currentAmount, language)}
                  </div>
                  <div className={styles.goalFoot}>
                    <span>{forecast.isOffTrack ? `Need SAR ${formatAmount(forecast.requiredMonthlyContribution, language)}/mo` : 'Pace looks healthy'}</span>
                    {primaryGoalId !== goal.id && (
                      <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={(event) => {
                          event.preventDefault();
                          void setPrimaryGoal(goal.id);
                        }}
                      >
                        Set primary
                      </button>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
