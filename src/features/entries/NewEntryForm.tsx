import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { Button, Input, Card } from '../../components/ui';
import styles from './NewEntryForm.module.css';
import type { PlanningEntryCategory, PlanningEntryKind, PlanningEntryStatus } from '../../lib/data/types';

const categoryOptions: Array<{ value: PlanningEntryCategory; kind: PlanningEntryKind; label: string }> = [
  { value: 'bank_balance', kind: 'positive', label: 'Bank balance' },
  { value: 'cash', kind: 'positive', label: 'Cash' },
  { value: 'owed_to_me', kind: 'positive', label: 'Owed to me' },
  { value: 'expected_profit', kind: 'positive', label: 'Expected profit' },
  { value: 'sale', kind: 'positive', label: 'Sale' },
  { value: 'salary', kind: 'positive', label: 'Salary' },
  { value: 'gift', kind: 'positive', label: 'Gift' },
  { value: 'expense', kind: 'negative', label: 'Expense' },
  { value: 'debt_i_owe', kind: 'negative', label: 'Debt I owe' },
  { value: 'installment', kind: 'negative', label: 'Installment' },
  { value: 'bill', kind: 'negative', label: 'Bill' },
  { value: 'custom', kind: 'negative', label: 'Custom' },
];

export default function NewEntryForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialKind = searchParams.get('kind') === 'negative' ? 'negative' : 'positive';
  const addPlanningEntry = useAppStore((s) => s.addPlanningEntry);
  const loading = useAppStore((s) => s.loading.planning);
  const error = useAppStore((s) => s.errors.planning);
  const clearError = useAppStore((s) => s.clearError);

  const [kind, setKind] = useState<PlanningEntryKind>(initialKind);
  const [category, setCategory] = useState<PlanningEntryCategory>(initialKind === 'positive' ? 'bank_balance' : 'expense');
  const [title, setTitle] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [status, setStatus] = useState<Exclude<PlanningEntryStatus, 'cancelled'>>('expected');
  const [actualAmount, setActualAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCategories = categoryOptions.filter((option) => option.kind === kind || option.value === 'custom');

  const handleKindChange = (nextKind: PlanningEntryKind) => {
    setKind(nextKind);
    setCategory(nextKind === 'positive' ? 'bank_balance' : 'expense');
  };

  const handleSave = async (addAnother = false) => {
    const amount = parseFloat(expectedAmount);
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const parsedActual = actualAmount ? parseFloat(actualAmount) : undefined;
    clearError('planning');

    try {
      await addPlanningEntry({
        kind,
        status,
        category,
        title: title.trim(),
        expectedAmount: amount,
        actualAmount: status === 'confirmed' && Number.isFinite(parsedActual) ? parsedActual : status === 'confirmed' ? amount : undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });

      if (addAnother) {
        setTitle('');
        setExpectedAmount('');
        setActualAmount('');
        setDueDate('');
        setNotes('');
        return;
      }

      navigate('/transactions');
    } catch {
      // Error state is rendered below.
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>{t('entries.addEntry')}</h1>
      </header>

      <div className={styles.tabs}>
        {(['positive', 'negative'] as const).map((value) => (
          <button key={value} className={`${styles.tab} ${kind === value ? styles.tabActive : ''}`} onClick={() => handleKindChange(value)}>
            {value === 'positive' ? t('planner.positive') : t('planner.negative')}
          </button>
        ))}
      </div>

      <Card padding="md">
        <div className={styles.amountSection}>
          <input
            className={styles.amountInput}
            type="number"
            value={expectedAmount}
            onChange={(event) => setExpectedAmount(event.target.value)}
            placeholder="0.00"
            autoFocus
          />
          <span className={styles.amountCurrency}>{t('common.sar')}</span>
        </div>
      </Card>

      <Card padding="md">
        <div className={styles.fields}>
          {error && <p className={styles.fieldLabel}>{error}</p>}

          <Input label={t('planner.title')} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Expected sale profit" />

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('entries.category')}</label>
            <div className={styles.catGrid}>
              {filteredCategories.map((option) => (
                <button key={option.value} type="button" className={`${styles.catBtn} ${category === option.value ? styles.catActive : ''}`} onClick={() => setCategory(option.value)}>
                  <span className={styles.catName}>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('planner.status')}</label>
            <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value as Exclude<PlanningEntryStatus, 'cancelled'>)}>
              <option value="expected">{t('planner.expected')}</option>
              <option value="confirmed">{t('planner.confirmed')}</option>
            </select>
          </div>

          {status === 'confirmed' && (
            <Input
              label={t('planner.actualAmount')}
              type="number"
              value={actualAmount}
              onChange={(event) => setActualAmount(event.target.value)}
              placeholder={expectedAmount || '0.00'}
              helperText={t('planner.actualHelper')}
            />
          )}

          <Input label={t('entries.date')} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('entries.notes')}</label>
            <textarea className={styles.textarea} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('entries.notesPlaceholder')} rows={2} />
          </div>
        </div>
      </Card>

      <div className={styles.actions}>
        <Button fullWidth size="lg" onClick={() => handleSave(false)} loading={loading}>{t('entries.save')}</Button>
        <Button fullWidth variant="secondary" onClick={() => handleSave(true)} disabled={loading}>{t('entries.saveAndAdd')}</Button>
      </div>
    </div>
  );
}
