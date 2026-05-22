import { Link } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { formatAmount } from '../../lib/utils/currency';
import { Card, Button, Input, ProgressBar, EmptyState } from '../../components/ui';
import styles from './GoalsPage.module.css';

const presetIcons = ['🎯', '🏠', '🚗', '✈️', '💻', '🎓', '💰', '💍', '🌴', '🏥'];
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
  const accounts = useAppStore((s) => s.accounts);
  const loading = useAppStore((s) => s.loading.goals);
  const error = useAppStore((s) => s.errors.goals);
  const clearError = useAppStore((s) => s.clearError);

  const curr = language === 'ar' ? 'ر.س' : 'SAR';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    monthlyContribution: '',
    targetDate: endOfNextMonth(),
    icon: '🎯',
    color: '#2D5A3D',
    initialDeposit: '',
    accountId: '',
  });

  const handleAdd = async () => {
    clearError('goals');
    if (!form.name || !form.targetAmount) {
      return;
    }

    const activeAccountId = form.accountId || accounts[0]?.id || '';

    try {
      await addGoal({
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        monthlyContribution: parseFloat(form.monthlyContribution) || 0,
        targetDate: form.targetDate || endOfNextMonth(),
        icon: form.icon,
        color: form.color,
        initialDeposit: form.initialDeposit ? parseFloat(form.initialDeposit) : 0,
        accountId: form.initialDeposit && parseFloat(form.initialDeposit) > 0 ? activeAccountId : undefined,
      });
      setForm({
        name: '',
        targetAmount: '',
        monthlyContribution: '',
        targetDate: endOfNextMonth(),
        icon: '🎯',
        color: '#2D5A3D',
        initialDeposit: '',
        accountId: '',
      });
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
        <Button onClick={() => setShowForm(!showForm)} iconLeft={<Plus size={16} />}>{t('goals.addGoal')}</Button>
      </header>

      {/* Add Form */}
      {showForm && (
        <Card padding="md" className={`${styles.formCard} slide-up`}>
          <h3 className={styles.formTitle}>{t('goals.addGoal')}</h3>
          <div className={styles.formGrid}>
            <Input label={t('goals.goalName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. New Home Savings" />
            <Input label={t('goals.targetAmount')} type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="0.00" />
            <Input label={t('goals.monthlyContribution')} type="number" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} placeholder="0.00" />
            <Input label={t('goals.targetDate')} type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            <Input label={t('goals.initialDeposit')} type="number" value={form.initialDeposit} onChange={(e) => setForm({ ...form, initialDeposit: e.target.value })} placeholder="0.00" />
            
            {parseFloat(form.initialDeposit) > 0 && (
              <div>
                <label className={styles.fieldLabel}>{t('entries.account')}</label>
                <select style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} value={form.accountId || accounts[0]?.id || ''} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={styles.fieldLabel}>{language === 'ar' ? 'أيقونة' : 'Icon'}</label>
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
          {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 'var(--space-2) 0' }}>{error}</p>}
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAdd} loading={loading}>{t('common.save')}</Button>
          </div>
        </Card>
      )}

      {goals.length === 0 ? (
        <EmptyState icon="🎯" title={t('goals.emptyTitle')} description={t('goals.emptyDescription')} action={<Button onClick={() => setShowForm(true)} iconLeft={<Plus size={16} />}>{t('goals.addGoal')}</Button>} />
      ) : (
        <div className={styles.grid}>
          {goals.map((goal, i) => {
            const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            return (
              <Link to={`/goals/${goal.id}`} key={goal.id} className={`${styles.card} slide-up stagger-${i + 1}`}>
                <div className={styles.cardTop}>
                  <span className={styles.icon}>{goal.icon}</span>
                  <span className={styles.pct} style={{ color: goal.color }}>{pct}%</span>
                </div>
                <h3 className={styles.goalName}>{goal.name}</h3>
                <ProgressBar value={pct} color={goal.color} size="md" />
                <div className={styles.amounts}>
                  <span>{curr} {formatAmount(goal.currentAmount, language)}</span>
                  <span className={styles.target}>{language === 'ar' ? 'من' : 'of'} {curr} {formatAmount(goal.targetAmount, language)}</span>
                </div>
                <div className={styles.remaining}>
                  {t('goals.remainingAmount')}: {curr} {formatAmount(goal.targetAmount - goal.currentAmount, language)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


