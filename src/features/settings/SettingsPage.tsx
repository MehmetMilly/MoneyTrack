import { useNavigate } from 'react-router-dom';
import { Globe, Sun, Moon, Desktop, ShieldCheck, SignOut, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import { Card } from '../../components/ui';
import styles from './SettingsPage.module.css';
import type { Theme } from '../../lib/data/types';
import { formatDate } from '../../lib/utils/dates';

export default function SettingsPage() {
  const { t, language } = useTranslation();
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const isOffline = useAppStore((s) => s.isOffline);
  const savingSettings = useAppStore((s) => s.loading.settings);
  const authLoading = useAppStore((s) => s.loading.auth);
  const settingsError = useAppStore((s) => s.errors.settings);
  const authError = useAppStore((s) => s.errors.auth);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setTheme = useAppStore((s) => s.setTheme);
  const logout = useAppStore((s) => s.logout);
  const navigate = useNavigate();

  const initials = (profile.name || 'MT').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const syncLabel = isOffline
    ? t('dashboard.offline')
    : lastSyncedAt
      ? `${formatDate(lastSyncedAt, language)} ${new Date(lastSyncedAt).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-SA', {
          hour: 'numeric',
          minute: '2-digit',
        })}`
      : t('common.loading');

  const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun size={22} />, label: t('settings.light') },
    { value: 'dark', icon: <Moon size={22} />, label: t('settings.dark') },
    { value: 'system', icon: <Desktop size={22} />, label: t('settings.system') },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      // Error state is rendered below.
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('settings.title')}</h1>

      {/* Profile */}
      <Card padding="md">
        <div className={styles.profileRow}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{profile.name}</span>
            <span className={styles.profileEmail}>{profile.email}</span>
          </div>
          <CaretRight size={16} color="var(--color-text-muted)" />
        </div>
      </Card>

      {/* Preferences */}
      <Card header={t('settings.preferences')}>
        {/* Language */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabel}>
            <Globe size={18} />
            <span>{t('settings.language')}</span>
          </div>
          <div className={styles.langToggle}>
            <button className={`${styles.langBtn} ${language === 'en' ? styles.langActive : ''}`} onClick={() => setLanguage('en')}>{t('settings.english')}</button>
            <button className={`${styles.langBtn} ${language === 'ar' ? styles.langActive : ''}`} onClick={() => setLanguage('ar')}>{t('settings.arabic')}</button>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Currency */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabel}>
            <span style={{ fontSize: 'var(--text-lg)' }}>﷼</span>
            <span>{t('settings.currency')}</span>
          </div>
          <span className={styles.settingValue}>{t('settings.sarLabel')}</span>
        </div>

        <div className={styles.divider} />

        {/* Theme */}
        <div className={styles.settingRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
          <div className={styles.settingLabel}>
            <Sun size={18} />
            <span>{t('settings.theme')}</span>
          </div>
          <div className={styles.themeGrid}>
            {themeOptions.map((opt) => (
              <button key={opt.value} className={`${styles.themeCard} ${settings.theme === opt.value ? styles.themeActive : ''}`} onClick={() => setTheme(opt.value)}>
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
        {settingsError && <p className={styles.syncTime}>{settingsError}</p>}
        {savingSettings && <p className={styles.syncTime}>{t('common.loading')}</p>}
      </Card>

      {/* Sync */}
      <Card header={t('settings.backupSync')}>
        <div className={styles.settingRow}>
          <div className={styles.settingLabel}>
            <CheckCircle size={18} color="var(--color-success)" weight="fill" />
            <div>
              <span>{t('settings.syncDesc')}</span>
              <span className={styles.syncTime}>{t('settings.lastSynced', { time: syncLabel })}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card header={t('settings.accountSecurity')}>
        <div className={styles.settingRow}>
          <div className={styles.settingLabel}>
            <ShieldCheck size={18} />
            <span>{t('settings.changePassword')}</span>
          </div>
          <CaretRight size={16} color="var(--color-text-muted)" />
        </div>
      </Card>

      {/* About */}
      <Card>
        <div className={styles.settingRow}>
          <span className={styles.aboutText}>{t('settings.about')} — {t('settings.version')}</span>
        </div>
      </Card>

      {/* Logout */}
      {authError && <p className={styles.syncTime}>{authError}</p>}
      <button className={styles.logoutBtn} onClick={handleLogout} disabled={authLoading}>
        <SignOut size={18} />
        {t('settings.logout')}
      </button>
    </div>
  );
}
