import { Outlet } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import styles from './AuthLayout.module.css';

export default function AuthLayout() {
  const { t, language } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (
    <div className={styles.layout}>
      {/* Language toggle */}
      <button
        className={styles.langToggle}
        onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
      >
        {language === 'en' ? 'العربية' : 'English'}
      </button>

      {/* Branding side */}
      <div className={styles.branding}>
        <div className={styles.brandContent}>
          <div className={styles.ruledLines} aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className={styles.ruleLine} />
            ))}
          </div>
          <div className={styles.brandText}>
            <span className={styles.logoMark}>◈</span>
            <h1 className={styles.logoTitle}>MoneyTrack</h1>
            <p className={styles.tagline}>{t('app.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
