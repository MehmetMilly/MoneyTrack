import { Link } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { AmountDisplay, Card, Button, EmptyState, Badge } from '../../components/ui';
import { formatDateShort } from '../../lib/utils/dates';
import styles from './EntriesPage.module.css';
import type { PlanningEntry } from '../../lib/data/types';

function entryAmount(entry: PlanningEntry) {
  if (entry.status === 'confirmed' && typeof entry.actualAmount === 'number') {
    return entry.actualAmount;
  }

  return entry.expectedAmount;
}

export default function EntriesPage() {
  const { t, language } = useTranslation();
  const planningEntries = useAppStore((s) => s.planningEntries);
  const updatePlanningEntry = useAppStore((s) => s.updatePlanningEntry);
  const deletePlanningEntry = useAppStore((s) => s.deletePlanningEntry);
  const markPlanningEntryConfirmed = useAppStore((s) => s.markPlanningEntryConfirmed);
  const markPlanningEntryCancelled = useAppStore((s) => s.markPlanningEntryCancelled);
  const loading = useAppStore((s) => s.loading.planning);
  const error = useAppStore((s) => s.errors.planning);
  const clearError = useAppStore((s) => s.clearError);
  const sorted = [...planningEntries].sort((a, b) => (b.dueDate || b.createdAt).localeCompare(a.dueDate || a.createdAt));

  const handleConfirm = async (entry: PlanningEntry, askForActual = false) => {
    const rawAmount = askForActual
      ? window.prompt(t('planner.confirmActualPrompt'), String(entry.actualAmount ?? entry.expectedAmount))
      : String(entry.expectedAmount);

    if (rawAmount === null) return;

    const amount = parseFloat(rawAmount);
    if (!Number.isFinite(amount)) return;

    clearError('planning');
    try {
      await markPlanningEntryConfirmed(entry.id, amount);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleEdit = async (entry: PlanningEntry) => {
    const nextTitle = window.prompt(t('planner.editTitlePrompt'), entry.title);
    if (nextTitle === null) return;

    const nextAmount = window.prompt(t('planner.editAmountPrompt'), String(entry.expectedAmount));
    if (nextAmount === null) return;

    const amount = parseFloat(nextAmount);
    if (!nextTitle.trim() || !Number.isFinite(amount) || amount <= 0) return;

    clearError('planning');
    try {
      await updatePlanningEntry(entry.id, {
        title: nextTitle.trim(),
        expectedAmount: amount,
        actualAmount: entry.status === 'confirmed' ? entry.actualAmount ?? amount : undefined,
      });
    } catch {
      // Error state is rendered below.
    }
  };

  const handleCancel = async (id: string) => {
    clearError('planning');
    try {
      await markPlanningEntryCancelled(id);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleDelete = async (id: string) => {
    clearError('planning');
    try {
      await deletePlanningEntry(id);
    } catch {
      // Error state is rendered below.
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('entries.title')}</h1>
          <p className={styles.subtitle}>{t('entries.subtitle')}</p>
        </div>
        <Link to="/transactions/new">
          <Button iconLeft={<Plus size={16} />}>{t('entries.addEntry')}</Button>
        </Link>
      </header>
      {error && <p className={styles.subtitle}>{error}</p>}

      {planningEntries.length === 0 ? (
        <EmptyState icon="+" title={t('entries.emptyTitle')} description={t('entries.emptyDescription')} action={<Link to="/transactions/new"><Button iconLeft={<Plus size={16} />}>{t('entries.addEntry')}</Button></Link>} />
      ) : (
        <Card>
          <div className={styles.group}>
            <div className={styles.groupLabel}>{t('planner.allPlannerEntries')}</div>
            {sorted.map((entry, index) => {
              const sign = entry.kind === 'positive' ? '+' : '-';
              const amount = entryAmount(entry);
              return (
                <div key={entry.id} className={`${styles.row} slide-up stagger-${Math.min(index + 1, 8)}`}>
                  <span className={styles.rowEmoji}>{entry.kind === 'positive' ? '+' : '-'}</span>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowName}>{entry.title}</span>
                    <span className={styles.rowCat}>
                      {entry.category.replaceAll('_', ' ')}
                      {entry.dueDate ? ` · ${formatDateShort(entry.dueDate, language)}` : ''}
                    </span>
                  </div>
                  <div className={styles.rowRight}>
                    <AmountDisplay amount={amount} size="sm" sign={sign} showCurrency />
                    <Badge variant={entry.status === 'confirmed' ? 'paid' : entry.status === 'cancelled' ? 'overdue' : 'upcoming'} stamp>
                      {t(`planner.${entry.status}` as 'planner.expected')}
                    </Badge>
                    {entry.status === 'confirmed' && entry.actualAmount !== undefined && entry.actualAmount !== entry.expectedAmount && (
                      <span className={styles.rowDate}>{t('planner.expectedWas', { amount: String(entry.expectedAmount) })}</span>
                    )}
                  </div>
                  <div className={styles.rowRight}>
                    {entry.status === 'expected' && (
                      <>
                        <button className={styles.delBtn} onClick={() => handleConfirm(entry)} disabled={loading}>{t('planner.markConfirmed')}</button>
                        <button className={styles.delBtn} onClick={() => handleConfirm(entry, true)} disabled={loading}>{t('planner.confirmActual')}</button>
                        <button className={styles.delBtn} onClick={() => handleCancel(entry.id)} disabled={loading}>{t('planner.cancelEntry')}</button>
                      </>
                    )}
                    <button className={styles.delBtn} onClick={() => handleEdit(entry)} disabled={loading}>{t('common.edit')}</button>
                    <button className={styles.delBtn} onClick={() => handleDelete(entry.id)} disabled={loading}>{t('common.delete')}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
