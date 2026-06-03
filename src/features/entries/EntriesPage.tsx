import { Link } from 'react-router-dom';
import { ArrowCircleDown, ArrowCircleUp, FunnelSimple, MagnifyingGlass, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { AmountDisplay, Badge, Button, EmptyState, Input, SegmentedControl } from '../../components/ui';
import { formatDateShort } from '../../lib/utils/dates';
import styles from './EntriesPage.module.css';
import type { Debt, PlanningEntry } from '../../lib/data/types';

type MoneyRow = {
  id: string;
  title: string;
  meta: string;
  amount: number;
  sign: '+' | '-';
  status: PlanningEntry['status'] | 'available';
  entry?: PlanningEntry;
};

type EntryFilter = 'all' | 'expected' | 'confirmed';

function entryAmount(entry: PlanningEntry) {
  if (entry.status === 'confirmed' && typeof entry.actualAmount === 'number') {
    return entry.actualAmount;
  }

  return entry.expectedAmount;
}

function debtRemaining(debt: Debt) {
  return Math.max(0, debt.totalAmount - debt.paidAmount);
}

function pretty(value: string) {
  return value.replaceAll('_', ' ');
}

function matchesFilter(status: MoneyRow['status'], filter: EntryFilter) {
  if (filter === 'all') {
    return true;
  }

  return status === filter;
}

export default function EntriesPage() {
  const { t, language } = useTranslation();
  const accounts = useAppStore((s) => s.accounts);
  const debts = useAppStore((s) => s.debts);
  const planningEntries = useAppStore((s) => s.planningEntries);
  const updatePlanningEntry = useAppStore((s) => s.updatePlanningEntry);
  const deletePlanningEntry = useAppStore((s) => s.deletePlanningEntry);
  const markPlanningEntryConfirmed = useAppStore((s) => s.markPlanningEntryConfirmed);
  const markPlanningEntryCancelled = useAppStore((s) => s.markPlanningEntryCancelled);
  const loading = useAppStore((s) => s.loading.planning);
  const error = useAppStore((s) => s.errors.planning);
  const clearError = useAppStore((s) => s.clearError);

  const [filter, setFilter] = useState<EntryFilter>('all');
  const [search, setSearch] = useState('');
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({});
  const [editingEntry, setEditingEntry] = useState<PlanningEntry | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    expectedAmount: '',
    dueDate: '',
    notes: '',
  });

  const activeEntries = [...planningEntries].filter((entry) => entry.status !== 'cancelled');
  const assetRows: MoneyRow[] = [
    ...accounts.map((account) => ({
      id: `account-${account.id}`,
      title: account.name,
      meta: t(`accounts.${account.type}` as 'accounts.bank'),
      amount: account.balance,
      sign: '+' as const,
      status: 'available' as const,
    })),
    ...debts
      .filter((debt) => debt.type === 'owed_to_me' && debt.status !== 'paid')
      .map((debt) => ({
        id: `debt-${debt.id}`,
        title: debt.name,
        meta: t('debts.owedToMe'),
        amount: debtRemaining(debt),
        sign: '+' as const,
        status: 'expected' as const,
      })),
    ...activeEntries
      .filter((entry) => entry.kind === 'positive')
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        meta: `${pretty(entry.category)}${entry.dueDate ? ` - ${formatDateShort(entry.dueDate, language)}` : ''}`,
        amount: entryAmount(entry),
        sign: '+' as const,
        status: entry.status,
        entry,
      })),
  ];
  const drainRows: MoneyRow[] = [
    ...debts
      .filter((debt) => debt.type === 'owed_by_me' && debt.status !== 'paid')
      .map((debt) => ({
        id: `debt-${debt.id}`,
        title: debt.name,
        meta: t('debts.owedByMe'),
        amount: debtRemaining(debt),
        sign: '-' as const,
        status: 'expected' as const,
      })),
    ...activeEntries
      .filter((entry) => entry.kind === 'negative')
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        meta: `${pretty(entry.category)}${entry.dueDate ? ` - ${formatDateShort(entry.dueDate, language)}` : ''}`,
        amount: entryAmount(entry),
        sign: '-' as const,
        status: entry.status,
        entry,
      })),
  ];

  const normalizedSearch = search.trim().toLowerCase();
  const filterRows = (rows: MoneyRow[]) =>
    rows.filter((row) => {
      if (!matchesFilter(row.status, filter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return `${row.title} ${row.meta}`.toLowerCase().includes(normalizedSearch);
    });

  const filteredAssets = filterRows(assetRows);
  const filteredDrains = filterRows(drainRows);
  const expectedCount = activeEntries.filter((entry) => entry.status === 'expected').length;
  const confirmedCount = activeEntries.filter((entry) => entry.status === 'confirmed').length;

  const openEdit = (entry: PlanningEntry) => {
    setEditingEntry(entry);
    setEditForm({
      title: entry.title,
      expectedAmount: String(entry.expectedAmount),
      dueDate: entry.dueDate || '',
      notes: entry.notes || '',
    });
  };

  const handleConfirm = async (entry: PlanningEntry, useActualInput = false) => {
    const rawAmount = useActualInput ? actualInputs[entry.id] || '' : String(entry.expectedAmount);
    const amount = parseFloat(rawAmount || String(entry.expectedAmount));
    if (!Number.isFinite(amount)) {
      return;
    }

    clearError('planning');
    try {
      await markPlanningEntryConfirmed(entry.id, amount);
      setActualInputs((current) => ({ ...current, [entry.id]: '' }));
    } catch {
      // Error state is rendered below.
    }
  };

  const handleEditSave = async () => {
    if (!editingEntry) {
      return;
    }

    const amount = parseFloat(editForm.expectedAmount);
    if (!editForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    clearError('planning');
    try {
      await updatePlanningEntry(editingEntry.id, {
        title: editForm.title.trim(),
        expectedAmount: amount,
        dueDate: editForm.dueDate || undefined,
        notes: editForm.notes.trim() || undefined,
      });
      setEditingEntry(null);
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

  const renderRows = (rows: MoneyRow[]) => (
    <div className={styles.rowList}>
      {rows.map((row, index) => (
        <div key={row.id} className={`${styles.row} slide-up stagger-${Math.min(index + 1, 8)}`}>
          <span className={`${styles.rowMarker} ${row.sign === '+' ? styles.asset : styles.drain}`} />
          <div className={styles.rowInfo}>
            <span className={styles.rowName}>{row.title}</span>
            <span className={styles.rowCat}>{row.meta}</span>
          </div>
          <div className={styles.rowAmount}>
            <AmountDisplay amount={row.amount} size="sm" sign={row.sign} showCurrency />
            <Badge variant={row.status === 'confirmed' || row.status === 'available' ? 'paid' : 'upcoming'} stamp>
              {row.status === 'available' ? t('planner.available') : t(`planner.${row.status}` as 'planner.expected')}
            </Badge>
          </div>
          <div className={styles.rowActions}>
            {row.entry?.status === 'expected' && (
              <div className={styles.actionCluster}>
                <Input
                  className={styles.amountField}
                  aria-label={`${t('planner.actualAmount')} ${row.entry.title}`}
                  type="number"
                  placeholder={String(row.entry.expectedAmount)}
                  value={actualInputs[row.entry.id] || ''}
                  onChange={(event) => setActualInputs((current) => ({ ...current, [row.entry!.id]: event.target.value }))}
                />
                <button onClick={() => void handleConfirm(row.entry!)} disabled={loading}>{t('planner.markConfirmed')}</button>
                <button onClick={() => void handleConfirm(row.entry!, true)} disabled={loading}>{t('planner.confirmActual')}</button>
                <button onClick={() => void handleCancel(row.entry!.id)} disabled={loading}>{t('planner.cancelEntry')}</button>
              </div>
            )}
            {row.entry && (
              <div className={styles.actionCluster}>
                <button onClick={() => openEdit(row.entry!)} disabled={loading}>
                  <PencilSimple size={14} />
                  {t('common.edit')}
                </button>
                <button className={styles.dangerAction} onClick={() => void handleDelete(row.entry!.id)} disabled={loading}>
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('entries.title')}</h1>
          <p className={styles.subtitle}>{t('entries.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/transactions/new?kind=positive"><Button iconLeft={<ArrowCircleUp size={16} />}>{t('planner.addAsset')}</Button></Link>
          <Link to="/transactions/new?kind=negative"><Button variant="secondary" iconLeft={<ArrowCircleDown size={16} />}>{t('planner.addDrain')}</Button></Link>
        </div>
      </header>

      <section className={styles.summaryStrip}>
        <div>
          <span>Expected items</span>
          <strong>{expectedCount}</strong>
        </div>
        <div>
          <span>Confirmed items</span>
          <strong>{confirmedCount}</strong>
        </div>
        <div>
          <span>Visible rows</span>
          <strong>{filteredAssets.length + filteredDrains.length}</strong>
        </div>
      </section>

      <section className={styles.controls}>
        <SegmentedControl
          aria-label="Filter entries by state"
          value={filter}
          onChange={(value) => setFilter(value as EntryFilter)}
          options={[
            { value: 'all', label: 'All', icon: <FunnelSimple size={14} /> },
            { value: 'expected', label: 'Expected' },
            { value: 'confirmed', label: 'Confirmed' },
          ]}
        />
        <Input
          className={styles.searchField}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles, categories, or due dates"
          iconLeft={<MagnifyingGlass size={16} />}
          aria-label="Search entries"
        />
      </section>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.sections}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{t('planner.assets')}</h2>
            <span>{filteredAssets.length}</span>
          </div>
          {filteredAssets.length
            ? renderRows(filteredAssets)
            : <EmptyState title="No asset-side entries match this view" description="Try another filter or add a new asset entry." />}
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{t('planner.drains')}</h2>
            <span>{filteredDrains.length}</span>
          </div>
          {filteredDrains.length
            ? renderRows(filteredDrains)
            : <EmptyState title="No drain-side entries match this view" description="Try another filter or add a new drain entry." />}
        </section>
      </div>

      {editingEntry && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingEntry(null);
            }
          }}
        >
          <div className={styles.editModal} role="dialog" aria-modal="true" aria-labelledby="edit-entry-title">
            <div className={styles.modalHeader}>
              <div>
                <h2 id="edit-entry-title">Edit planner entry</h2>
                <p>Update the label, target amount, and context without leaving this page.</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setEditingEntry(null)} aria-label={t('common.close')}>
                x
              </button>
            </div>
            <div className={styles.modalGrid}>
              <Input label={t('planner.title')} value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} />
              <Input label={t('planner.expected')} type="number" value={editForm.expectedAmount} onChange={(event) => setEditForm((current) => ({ ...current, expectedAmount: event.target.value }))} />
              <Input label={t('entries.date')} type="date" value={editForm.dueDate} onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))} />
              <Input label={t('entries.notes')} value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setEditingEntry(null)}>{t('common.cancel')}</Button>
              <Button onClick={() => void handleEditSave()} loading={loading}>{t('common.save')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
