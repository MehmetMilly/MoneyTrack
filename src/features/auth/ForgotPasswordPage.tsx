import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Envelope, CheckCircle } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import Input from '../../components/ui/Input/Input';
import Button from '../../components/ui/Button/Button';
import styles from './LoginPage.module.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const sendPasswordReset = useAppStore((s) => s.sendPasswordReset);
  const loading = useAppStore((s) => s.loading.auth);
  const error = useAppStore((s) => s.errors.auth);
  const clearError = useAppStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError('auth');

    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch {
      // Error state is stored centrally for the page to render.
    }
  };

  if (sent) {
    return (
      <div className={styles.page} style={{ textAlign: 'center' }}>
        <CheckCircle size={56} weight="thin" color="var(--color-success)" />
        <h2 className={styles.title}>{t('auth.resetSent')}</h2>
        <Link to="/login" style={{ marginTop: 'var(--space-4)' }}>{t('auth.backToLogin')}</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('auth.resetTitle')}</h2>
        <p className={styles.subtitle}>{t('auth.resetSubtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} iconLeft={<Envelope size={18} />} required />
        {error && <p className={styles.subtitle}>{error}</p>}
        <Button type="submit" fullWidth size="lg" loading={loading}>{t('auth.resetButton')}</Button>
      </form>
      <p className={styles.footer}>
        <Link to="/login">{t('auth.backToLogin')}</Link>
      </p>
    </div>
  );
}
