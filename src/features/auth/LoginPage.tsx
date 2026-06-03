import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Envelope, Lock } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { isFirebaseConfigured } from '../../lib/firebase/client';
import Input from '../../components/ui/Input/Input';
import Button from '../../components/ui/Button/Button';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const startDemoSession = useAppStore((s) => s.startDemoSession);
  const loading = useAppStore((s) => s.loading.auth);
  const error = useAppStore((s) => s.errors.auth);
  const clearError = useAppStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError('auth');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // Error state is stored centrally for the page to render.
    }
  };

  const handleGoogleLogin = async () => {
    clearError('auth');

    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch {
      // Error state is stored centrally for the page to render.
    }
  };

  const handleDemoMode = () => {
    clearError('auth');
    startDemoSession();
    navigate('/dashboard');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('auth.welcomeTitle')}</h2>
        <p className={styles.subtitle}>{t('auth.welcomeSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          iconLeft={<Envelope size={18} />}
          required
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          iconLeft={<Lock size={18} />}
          required
        />
        {error && <p className={styles.errorText}>{error}</p>}

        <Link to="/forgot-password" className={styles.forgotLink}>
          {t('auth.forgotLink')}
        </Link>

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t('auth.loginButton')}
        </Button>
        <Button type="button" fullWidth size="lg" variant="secondary" loading={loading} onClick={handleGoogleLogin}>
          {t('auth.googleButton')}
        </Button>

        <div className={styles.demoBlock}>
          <Button type="button" fullWidth size="lg" variant="ghost" onClick={handleDemoMode}>
            {t('auth.demoButton')}
          </Button>
          <p className={styles.demoHint}>
            {isFirebaseConfigured
              ? t('auth.demoHint')
              : 'Firebase is not configured locally, so demo mode is the fastest way to review the app.'}
          </p>
        </div>
      </form>

      <p className={styles.footer}>
        {t('auth.noAccount')}{' '}
        <Link to="/signup">{t('auth.signup')}</Link>
      </p>
    </div>
  );
}
