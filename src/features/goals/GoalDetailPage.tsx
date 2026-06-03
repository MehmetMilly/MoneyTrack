import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, CalendarBlank } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { formatAmount } from '../../lib/utils/currency';
import { formatDate } from '../../lib/utils/dates';
import { Card, Button, ProgressBar, AmountDisplay } from '../../components/ui';
import styles from './GoalDetailPage.module.css';

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const accounts = useAppStore((s) => s.accounts);
  const goals = useAppStore((s) => s.goals);
  const addContribution = useAppStore((s) => s.addContribution);
  const setPrimaryGoal = useAppStore((s) => s.setPrimaryGoal);
  const primaryGoalId = useAppStore((s) => s.settings.planner.primaryGoalId);
  const loading = useAppStore((s) => s.loading.goals);
  const error = useAppStore((s) => s.errors.goals);
  const clearError = useAppStore((s) => s.clearError);
  const goal = goals.find((g) => g.id === id);
  const [showAdd, setShowAdd] = useState(false);
  const [contribAmount, setContribAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  
  if (!goal) return <div className={styles.page}><p>{t('common.noData')}</p></div>;

  const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const curr = 'SAR';

  const handleAdd = async () => {
    if (!contribAmount) return;
    const activeAccountId = accountId || accounts[0]?.id || '';
    if (!activeAccountId) return;

    clearError('goals');

    try {
      await addContribution(goal.id, {
        amount: parseFloat(contribAmount),
        date: new Date().toISOString().split('T')[0],
        type: 'manual',
        accountId: activeAccountId,
      });
      setContribAmount('');
      setShowAdd(false);
    } catch {
      // Error state is rendered below.
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/goals')}><ArrowLeft size={20} /></button>
        <h1 className={styles.title}>{goal.name}</h1>
        {primaryGoalId !== goal.id && (
          <Button size="sm" variant="secondary" onClick={() => setPrimaryGoal(goal.id)}>{t('planner.chooseGoal')}</Button>
        )}
      </header>

      {/* Hero */}
      <Card variant="elevated" padding="lg">
        <div className={styles.hero}>
          <span className={styles.heroIcon}>{goal.icon}</span>
          <div className={styles.heroProgress}>
            <span className={styles.heroPct} style={{ color: goal.color }}>{pct}%</span>
            <span className={styles.heroLabel}>{t('goals.savedSoFar')}</span>
          </div>
        </div>
        <ProgressBar value={pct} color={goal.color} size="lg" />
        <div className={styles.heroAmounts}>
          <div>
            <div className={styles.heroAmountLabel}>{t('goals.currentAmount')}</div>
            <AmountDisplay amount={goal.currentAmount} size="md" showCurrency />
          </div>
          <div style={{ textAlign: 'end' }}>
            <div className={styles.heroAmountLabel}>{t('goals.remainingAmount')}</div>
            <AmountDisplay amount={remaining} size="md" showCurrency />
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card header={t('goals.goalSummary')}>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryRow}><span>{t('goals.monthlyPlan')}</span><span className={styles.summaryVal}>{curr} {formatAmount(goal.monthlyContribution, language)}</span></div>
          <div className={styles.summaryRow}><span>{t('goals.totalContributions')}</span><span className={styles.summaryVal}>{curr} {formatAmount(goal.currentAmount, language)}</span></div>
          <div className={styles.summaryRow}><span>{t('goals.targetDate')}</span><span className={styles.summaryVal}>{formatDate(goal.targetDate, language)}</span></div>
          <div className={styles.summaryRow}><span>{t('goals.goalCreated')}</span><span className={styles.summaryVal}>{formatDate(goal.createdAt, language)}</span></div>
        </div>
      </Card>

      {/* Add contribution */}
      <Button fullWidth variant="secondary" iconLeft={<Plus size={16} />} onClick={() => setShowAdd(!showAdd)}>{t('goals.addContribution')}</Button>
      {showAdd && (
        <Card padding="md" className="slide-up">
          <div className={styles.addForm}>
            <input className={styles.contribInput} type="number" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} placeholder="0.00" autoFocus />
            <select className={styles.contribInput} value={accountId || accounts[0]?.id || ''} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <Button onClick={handleAdd} loading={loading} disabled={accounts.length === 0}>{t('common.save')}</Button>
          </div>
          {error && <p className={styles.noData}>{error}</p>}
        </Card>
      )}

      {/* Contributions list */}
      <Card header={t('goals.recentContributions')}>
        <div className={styles.contribList}>
          {goal.contributions.length === 0 && <p className={styles.noData}>{t('common.noData')}</p>}
          {[...goal.contributions].reverse().map((c) => (
            <div key={c.id} className={styles.contribRow}>
              <Check size={16} color="var(--color-success)" weight="bold" />
              <span className={styles.contribDate}>
                <CalendarBlank size={12} /> {formatDate(c.date, language)}
              </span>
              <span className={styles.contribType}>{c.type === 'manual' ? t('goals.manual') : t('goals.scheduled')}</span>
              <AmountDisplay amount={c.amount} size="sm" sign="+" showCurrency />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

