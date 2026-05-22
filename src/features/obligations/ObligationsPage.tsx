import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { formatAmount } from '../../lib/utils/currency';
import { formatDateShort, getDueStatus } from '../../lib/utils/dates';
import { Card, AmountDisplay, Badge, ProgressBar, Button, Input } from '../../components/ui';
import styles from './ObligationsPage.module.css';

type Tab = 'timeline' | 'debts' | 'installments';
type Filter = 'all' | 'upcoming' | 'paid' | 'overdue';

export default function ObligationsPage() {
  const { t, language } = useTranslation();
  const accounts = useAppStore((s) => s.accounts);
  const debts = useAppStore((s) => s.debts);
  const installments = useAppStore((s) => s.installments);
  const reminders = useAppStore((s) => s.reminders);
  
  const markReminderPaid = useAppStore((s) => s.markReminderPaid);
  const addDebtPayment = useAppStore((s) => s.addDebtPayment);
  const markInstallmentPaid = useAppStore((s) => s.markInstallmentPaid);
  
  const addDebt = useAppStore((s) => s.addDebt);
  const deleteDebt = useAppStore((s) => s.deleteDebt);
  const addInstallment = useAppStore((s) => s.addInstallment);
  const deleteInstallment = useAppStore((s) => s.deleteInstallment);

  const loading = useAppStore((s) => s.loading.obligations);
  const error = useAppStore((s) => s.errors.obligations);
  const clearError = useAppStore((s) => s.clearError);

  const [tab, setTab] = useState<Tab>('timeline');
  const [filter, setFilter] = useState<Filter>('all');
  const [payDebtId, setPayDebtId] = useState<string | null>(null);
  const [payInstallmentId, setPayInstallmentId] = useState<string | null>(null);
  const [payReminderId, setPayReminderId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const activeAccountId = selectedAccountId || accounts[0]?.id || '';
  const curr = language === 'ar' ? 'ر.س' : 'SAR';

  // Debt Form State
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [debtForm, setDebtForm] = useState({
    name: '',
    type: 'owed_by_me' as 'owed_by_me' | 'owed_to_me',
    totalAmount: '',
    dueDate: '',
    creditor: '',
    notes: '',
  });

  // Installment Form State
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [installmentForm, setInstallmentForm] = useState({
    name: '',
    provider: '',
    monthlyAmount: '',
    totalAmount: '',
    totalInstallments: '',
    nextDueDate: '',
    notes: '',
  });


  const filteredReminders = reminders.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'paid') return r.status === 'paid';
    if (filter === 'overdue') return getDueStatus(r.dueDate) === 'overdue' && r.status !== 'paid';
    return r.status !== 'paid';
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const handleDebtPayment = async (debtId: string, markWithoutSourceAccount = false) => {
    if (!payAmount) return;

    clearError('obligations');

    try {
      await addDebtPayment(debtId, {
        amount: parseFloat(payAmount),
        date: new Date().toISOString().split('T')[0],
        accountId: markWithoutSourceAccount ? undefined : activeAccountId,
        markWithoutSourceAccount,
      });
      setPayAmount('');
      setPayDebtId(null);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleReminderPayment = async (reminderId: string, markWithoutSourceAccount = false) => {
    clearError('obligations');

    try {
      await markReminderPaid(reminderId, {
        accountId: markWithoutSourceAccount ? undefined : activeAccountId,
        markWithoutSourceAccount,
      });
      setPayReminderId(null);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleInstallmentPayment = async (installmentId: string, amount: number, markWithoutSourceAccount = false) => {
    clearError('obligations');

    try {
      await markInstallmentPaid(installmentId, {
        amount,
        date: new Date().toISOString().split('T')[0],
        accountId: markWithoutSourceAccount ? undefined : activeAccountId,
        markWithoutSourceAccount,
      });
      setPayInstallmentId(null);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleAddDebt = async () => {
    clearError('obligations');
    if (!debtForm.name || !debtForm.totalAmount || !debtForm.dueDate || !debtForm.creditor) {
      return;
    }
    try {
      await addDebt({
        name: debtForm.name,
        type: debtForm.type,
        totalAmount: parseFloat(debtForm.totalAmount),
        dueDate: debtForm.dueDate,
        creditor: debtForm.creditor,
        notes: debtForm.notes,
      });
      setDebtForm({
        name: '',
        type: 'owed_by_me',
        totalAmount: '',
        dueDate: '',
        creditor: '',
        notes: '',
      });
      setShowDebtForm(false);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleAddInstallment = async () => {
    clearError('obligations');
    if (!installmentForm.name || !installmentForm.monthlyAmount || !installmentForm.totalAmount || !installmentForm.totalInstallments || !installmentForm.nextDueDate || !installmentForm.provider) {
      return;
    }
    try {
      await addInstallment({
        name: installmentForm.name,
        monthlyAmount: parseFloat(installmentForm.monthlyAmount),
        totalAmount: parseFloat(installmentForm.totalAmount),
        totalInstallments: parseInt(installmentForm.totalInstallments, 10),
        nextDueDate: installmentForm.nextDueDate,
        startDate: new Date().toISOString().split('T')[0],
        provider: installmentForm.provider,
        notes: installmentForm.notes,
      });
      setInstallmentForm({
        name: '',
        provider: '',
        monthlyAmount: '',
        totalAmount: '',
        totalInstallments: '',
        nextDueDate: '',
        notes: '',
      });
      setShowInstallmentForm(false);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    clearError('obligations');

    try {
      await deleteDebt(debtId);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleDeleteInstallment = async (installmentId: string) => {
    clearError('obligations');

    try {
      await deleteInstallment(installmentId);
    } catch {
      // Error state is rendered below.
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('obligations.title')}</h1>
          <p className={styles.subtitle}>{t('obligations.subtitle')}</p>
        </div>
        {tab === 'debts' && (
          <Button onClick={() => setShowDebtForm(!showDebtForm)} iconLeft={<Plus size={16} />}>{t('debts.addDebt')}</Button>
        )}
        {tab === 'installments' && (
          <Button onClick={() => setShowInstallmentForm(!showInstallmentForm)} iconLeft={<Plus size={16} />}>{t('installments.addInstallment')}</Button>
        )}
      </header>
      {error && <p className={styles.subtitle} style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['timeline', 'debts', 'installments'] as const).map((tb) => (
          <button key={tb} className={`${styles.tab} ${tab === tb ? styles.tabActive : ''}`} onClick={() => setTab(tb)}>
            {tb === 'timeline' ? t('obligations.timeline') : tb === 'debts' ? t('obligations.debtsTab') : t('obligations.installmentsTab')}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === 'timeline' && (
        <div className={styles.filters}>
          {(['all', 'upcoming', 'paid', 'overdue'] as const).map((f) => (
            <button key={f} className={`${styles.filterPill} ${filter === f ? styles.filterActive : ''}`} onClick={() => setFilter(f)}>
              {t(`obligations.${f}` as 'obligations.all')}
            </button>
          ))}
        </div>
      )}

      {/* Add Debt Form */}
      {tab === 'debts' && showDebtForm && (
        <Card padding="md" className={`${styles.formCard} slide-up`}>
          <h3 className={styles.formTitle}>{t('debts.addDebt')}</h3>
          <div className={styles.formGrid}>
            <Input label={t('debts.creditor') || 'Name'} value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} placeholder="e.g. Loan from Ali" />
            <Input label={t('debts.totalAmount')} type="number" value={debtForm.totalAmount} onChange={(e) => setDebtForm({ ...debtForm, totalAmount: e.target.value })} placeholder="0.00" />
            <Input label={t('debts.dueDate')} type="date" value={debtForm.dueDate} onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })} />
            <Input label={t('debts.creditor')} value={debtForm.creditor} onChange={(e) => setDebtForm({ ...debtForm, creditor: e.target.value })} placeholder="e.g. Ali" />
            <div>
              <label className={styles.fieldLabel}>{t('debts.status')}</label>
              <div className={styles.typeGrid}>
                <button type="button" className={`${styles.typeBtn} ${debtForm.type === 'owed_by_me' ? styles.typeActive : ''}`} onClick={() => setDebtForm({ ...debtForm, type: 'owed_by_me' })}>
                  {t('debts.owedByMe')}
                </button>
                <button type="button" className={`${styles.typeBtn} ${debtForm.type === 'owed_to_me' ? styles.typeActive : ''}`} onClick={() => setDebtForm({ ...debtForm, type: 'owed_to_me' })}>
                  {t('debts.owedToMe')}
                </button>
              </div>
            </div>
            <Input label={t('entries.notes')} value={debtForm.notes} onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })} placeholder="..." />
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowDebtForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddDebt} loading={loading}>{t('common.save')}</Button>
          </div>
        </Card>
      )}

      {/* Add Installment Form */}
      {tab === 'installments' && showInstallmentForm && (
        <Card padding="md" className={`${styles.formCard} slide-up`}>
          <h3 className={styles.formTitle}>{t('installments.addInstallment')}</h3>
          <div className={styles.formGrid}>
            <Input label={t('installments.provider') || 'Name'} value={installmentForm.name} onChange={(e) => setInstallmentForm({ ...installmentForm, name: e.target.value })} placeholder="e.g. iPhone Installment" />
            <Input label={t('installments.monthlyAmount')} type="number" value={installmentForm.monthlyAmount} onChange={(e) => setInstallmentForm({ ...installmentForm, monthlyAmount: e.target.value })} placeholder="0.00" />
            <Input label={t('installments.totalAmount')} type="number" value={installmentForm.totalAmount} onChange={(e) => setInstallmentForm({ ...installmentForm, totalAmount: e.target.value })} placeholder="0.00" />
            <Input label={t('installments.remaining')} type="number" value={installmentForm.totalInstallments} onChange={(e) => setInstallmentForm({ ...installmentForm, totalInstallments: e.target.value })} placeholder="e.g. 12" />
            <Input label={t('installments.nextDue')} type="date" value={installmentForm.nextDueDate} onChange={(e) => setInstallmentForm({ ...installmentForm, nextDueDate: e.target.value })} />
            <Input label={t('installments.provider')} value={installmentForm.provider} onChange={(e) => setInstallmentForm({ ...installmentForm, provider: e.target.value })} placeholder="e.g. Jarir" />
            <Input label={t('entries.notes')} value={installmentForm.notes} onChange={(e) => setInstallmentForm({ ...installmentForm, notes: e.target.value })} placeholder="..." />
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowInstallmentForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddInstallment} loading={loading}>{t('common.save')}</Button>
          </div>
        </Card>
      )}

      {/* Timeline */}
      {tab === 'timeline' && (
        <Card>
          <div className={styles.list}>
            {filteredReminders.length === 0 && <p style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.noData')}</p>}
            {filteredReminders.map((rem, i) => {
              const status = rem.status === 'paid' ? 'paid' : getDueStatus(rem.dueDate);
              const badgeVar = status === 'overdue' ? 'overdue' : status === 'paid' ? 'paid' : status === 'due_today' || status === 'due_tomorrow' ? 'due_soon' : 'upcoming';
              return (
                <div key={rem.id} className={`${styles.timelineRow} slide-up stagger-${Math.min(i + 1, 8)}`}>
                  <div className={styles.dateCol}>
                    <span className={styles.dateDay}>{new Date(rem.dueDate).getDate()}</span>
                    <span className={styles.dateMonth}>{formatDateShort(rem.dueDate, language).split(' ')[1]}</span>
                  </div>
                  <div className={styles.timelineInfo}>
                    <span className={styles.timelineName}>{rem.title}</span>
                    <span className={styles.timelineType}>{rem.type}</span>
                  </div>
                  <div className={styles.timelineRight}>
                    <AmountDisplay amount={rem.amount} size="sm" showCurrency />
                    <Badge variant={badgeVar} stamp>{badgeVar === 'paid' ? (language === 'ar' ? 'مدفوع' : 'Paid') : badgeVar === 'overdue' ? (language === 'ar' ? 'متأخر' : 'Overdue') : badgeVar === 'due_soon' ? (language === 'ar' ? 'قريباً' : 'Soon') : (language === 'ar' ? 'قادم' : 'Upcoming')}</Badge>
                  </div>
                  {rem.status !== 'paid' && (
                    <>
                      <button className={styles.markBtn} onClick={() => setPayReminderId(payReminderId === rem.id ? null : rem.id)}>{t('obligations.markPaid')}</button>
                      {payReminderId === rem.id && (
                        <div className={styles.payForm}>
                          <select className={styles.payInput} value={activeAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" loading={loading} onClick={() => handleReminderPayment(rem.id)}>{t('common.payFromAccount')}</Button>
                          <Button size="sm" variant="ghost" disabled={loading} onClick={() => handleReminderPayment(rem.id, true)}>{t('common.markWithoutAccount')}</Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Debts */}
      {tab === 'debts' && (
        <Card>
          <div className={styles.list}>
            {debts.length === 0 && <p style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('debts.emptyTitle')}</p>}
            {debts.map((debt, i) => {
              const pct = Math.round((debt.paidAmount / debt.totalAmount) * 100);
              const remaining = debt.totalAmount - debt.paidAmount;
              return (
                <div key={debt.id} className={`${styles.debtRow} slide-up stagger-${i + 1}`}>
                  <div className={styles.debtTop}>
                    <div>
                      <span className={styles.debtName}>{debt.name}</span>
                      <span className={styles.debtCreditor}>{debt.creditor}</span>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge variant={debt.status === 'paid' ? 'paid' : debt.status === 'overdue' ? 'overdue' : 'active'} stamp>{debt.status === 'paid' ? (language === 'ar' ? 'مدفوع' : 'Paid') : debt.status === 'overdue' ? (language === 'ar' ? 'متأخر' : 'Overdue') : (language === 'ar' ? 'نشط' : 'Active')}</Badge>
                      <button className={styles.deleteBtn} onClick={() => void handleDeleteDebt(debt.id)} title={t('common.delete')}>×</button>
                    </div>
                  </div>
                  <ProgressBar value={pct} showValue size="sm" />
                  <div className={styles.debtAmounts}>
                    <span>{t('debts.paidAmount')}: {curr} {formatAmount(debt.paidAmount, language)}</span>
                    <span>{t('debts.remaining')}: {curr} {formatAmount(remaining, language)}</span>
                  </div>
                  {debt.status !== 'paid' && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setPayDebtId(payDebtId === debt.id ? null : debt.id)}>{t('debts.markPayment')}</Button>
                      {payDebtId === debt.id && (
                        <div className={styles.payForm}>
                          <input className={styles.payInput} type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
                          <select className={styles.payInput} value={activeAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" loading={loading} onClick={() => handleDebtPayment(debt.id)}>{t('common.payFromAccount')}</Button>
                          <Button size="sm" variant="ghost" disabled={loading} onClick={() => handleDebtPayment(debt.id, true)}>{t('common.markWithoutAccount')}</Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Installments */}
      {tab === 'installments' && (
        <Card>
          <div className={styles.list}>
            {installments.length === 0 && <p style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('installments.emptyDescription')}</p>}
            {installments.map((inst, i) => {
              const pct = Math.round((inst.paidInstallments / inst.totalInstallments) * 100);
              return (
                <div key={inst.id} className={`${styles.debtRow} slide-up stagger-${i + 1}`}>
                  <div className={styles.debtTop}>
                    <div>
                      <span className={styles.debtName}>{inst.name}</span>
                      <span className={styles.debtCreditor}>{inst.provider}</span>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge variant={inst.status === 'completed' ? 'paid' : 'active'} stamp>{inst.status === 'completed' ? t('installments.completed') : `${inst.paidInstallments}/${inst.totalInstallments}`}</Badge>
                      <button className={styles.deleteBtn} onClick={() => void handleDeleteInstallment(inst.id)} title={t('common.delete')}>×</button>
                    </div>
                  </div>
                  <ProgressBar value={pct} showValue size="sm" label={t('installments.paidCount', { paid: String(inst.paidInstallments), total: String(inst.totalInstallments) })} />
                  <div className={styles.debtAmounts}>
                    <span>{t('installments.monthlyAmount')}: {curr} {formatAmount(inst.monthlyAmount, language)}</span>
                    <span>{t('installments.nextDue')}: {formatDateShort(inst.nextDueDate, language)}</span>
                  </div>
                  {inst.status !== 'completed' && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setPayInstallmentId(payInstallmentId === inst.id ? null : inst.id)}>{t('obligations.markPaid')}</Button>
                      {payInstallmentId === inst.id && (
                        <div className={styles.payForm}>
                          <select className={styles.payInput} value={activeAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" loading={loading} onClick={() => handleInstallmentPayment(inst.id, inst.monthlyAmount)}>{t('common.payFromAccount')}</Button>
                          <Button size="sm" variant="ghost" disabled={loading} onClick={() => handleInstallmentPayment(inst.id, inst.monthlyAmount, true)}>{t('common.markWithoutAccount')}</Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

