import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Envelope, Lock } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import Input from '../../components/ui/Input/Input';
import Button from '../../components/ui/Button/Button';
import styles from './LoginPage.module.css';

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signup = useAppStore((s) => s.signup);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const loading = useAppStore((s) => s.loading.auth);
  const authError = useAppStore((s) => s.errors.auth);
  const clearError = useAppStore((s) => s.clearError);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('common.required');
    if (!email.trim()) newErrors.email = t('common.required');
    if (!password) newErrors.password = t('common.required');
    if (password !== confirmPassword) newErrors.confirm = 'Passwords do not match';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    clearError('auth');

    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch {
      // Error state is stored centrally for the page to render.
    }
  };

  const handleGoogleSignup = async () => {
    clearError('auth');

    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch {
      // Error state is stored centrally for the page to render.
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('auth.createTitle')}</h2>
        <p className={styles.subtitle}>{t('auth.createSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input label={t('auth.fullName')} value={name} onChange={(e) => setName(e.target.value)} iconLeft={<User size={18} />} error={errors.name} />
        <Input label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} iconLeft={<Envelope size={18} />} error={errors.email} />
        <Input label={t('auth.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} iconLeft={<Lock size={18} />} error={errors.password} />
        <Input label={t('auth.confirmPassword')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} iconLeft={<Lock size={18} />} error={errors.confirm} />
        {authError && <p className={styles.subtitle}>{authError}</p>}
        <Button type="submit" fullWidth size="lg" loading={loading}>{t('auth.signupButton')}</Button>
        <Button type="button" fullWidth size="lg" variant="secondary" loading={loading} onClick={handleGoogleSignup}>{t('auth.googleButton')}</Button>
      </form>

      <p className={styles.footer}>
        {t('auth.hasAccount')}{' '}
        <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  );
}
