import { useState } from 'react';
import { Bank, Wallet, CurrencyCircleDollar, PiggyBank, TrendUp, Plus } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { Card, AmountDisplay, Button, Input, EmptyState } from '../../components/ui';
import styles from './AccountsPage.module.css';
import type { TranslationKey } from '../../lib/i18n/useTranslation';

const typeIcons: Record<string, React.ReactNode> = {
  bank: <Bank size={20} />,
  cash: <CurrencyCircleDollar size={20} />,
  wallet: <Wallet size={20} />,
  investment: <TrendUp size={20} />,
  savings: <PiggyBank size={20} />,
};

const presetColors = ['#2D5A3D', '#3B6B96', '#B8860B', '#6B5B95', '#8B7E6A', '#C4314B', '#D4A843', '#5BA87A'];

export default function AccountsPage() {
  const { t } = useTranslation();
  const accounts = useAppStore((s) => s.accounts);
  const addAccount = useAppStore((s) => s.addAccount);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const loading = useAppStore((s) => s.loading.accounts);
  const error = useAppStore((s) => s.errors.accounts);
  const clearError = useAppStore((s) => s.clearError);
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ name: string; type: 'bank' | 'cash' | 'wallet' | 'investment' | 'savings'; balance: string; color: string }>({ name: '', type: 'bank', balance: '', color: presetColors[0] });

  const handleAdd = async () => {
    clearError('accounts');

    try {
      await addAccount({
        name: form.name || 'New Account',
        type: form.type,
        balance: parseFloat(form.balance) || 0,
        color: form.color,
      });
      setForm({ name: '', type: 'bank', balance: '', color: presetColors[0] });
      setShowForm(false);
    } catch {
      // Error state is rendered below.
    }
  };

  const handleDelete = async (id: string) => {
    clearError('accounts');

    try {
      await deleteAccount(id);
    } catch {
      // Error state is rendered below.
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('accounts.title')}</h1>
          <p className={styles.subtitle}>{t('accounts.subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} iconLeft={<Plus size={16} />}>{t('accounts.addAccount')}</Button>
      </header>
      {error && <p className={styles.subtitle}>{error}</p>}

      <Card variant="elevated" padding="lg">
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>{t('accounts.total')}</span>
          <AmountDisplay amount={total} size="lg" showCurrency />
        </div>
      </Card>

      {/* Add form */}
      {showForm && (
        <Card padding="md" className={`${styles.formCard} slide-up`}>
          <h3 className={styles.formTitle}>{t('accounts.addAccount')}</h3>
          <div className={styles.formGrid}>
            <Input label={t('accounts.accountName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Al Rajhi Bank" />
            <Input label={t('accounts.initialBalance')} type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0.00" />
            <div>
              <label className={styles.fieldLabel}>{t('accounts.type')}</label>
              <div className={styles.typeGrid}>
                {(['bank', 'cash', 'wallet', 'investment', 'savings'] as const).map((tp) => (
                  <button key={tp} type="button" className={`${styles.typeBtn} ${form.type === tp ? styles.typeActive : ''}`} onClick={() => setForm({ ...form, type: tp })}>
                    {typeIcons[tp]}
                    <span>{t(`accounts.${tp}` as TranslationKey)}</span>
                  </button>
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
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAdd} loading={loading}>{t('common.save')}</Button>
          </div>
        </Card>
      )}

      {/* Account list */}
      {accounts.length === 0 ? (
        <EmptyState icon={<Wallet size={48} weight="thin" />} title={t('accounts.emptyTitle')} description={t('accounts.emptyDescription')} action={<Button onClick={() => setShowForm(true)} iconLeft={<Plus size={16} />}>{t('accounts.addAccount')}</Button>} />
      ) : (
        <Card>
          <div className={styles.list}>
            {accounts.map((acc, i) => (
              <div key={acc.id} className={`${styles.row} slide-up stagger-${i + 1}`}>
                <div className={styles.rowIcon} style={{ backgroundColor: acc.color }}>{typeIcons[acc.type]}</div>
                <div className={styles.rowInfo}>
                  <span className={styles.rowType}>{t(`accounts.${acc.type}` as TranslationKey)}</span>
                </div>
                <AmountDisplay amount={acc.balance} size="md" showCurrency />
                <button className={styles.deleteBtn} onClick={() => handleDelete(acc.id)} title={t('common.delete')} disabled={loading}>×</button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
