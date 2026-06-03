import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowsLeftRight,
  ChartLineUp,
  GearSix,
  House,
  List,
  Plus,
  Scales,
  Target,
  Wallet,
} from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import styles from './AppLayout.module.css';

const navItems = [
  { path: '/dashboard', icon: House, labelKey: 'nav.dashboard' as const },
  { path: '/transactions', icon: ArrowsLeftRight, labelKey: 'nav.transactions' as const },
  { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts' as const },
  { path: '/goals', icon: Target, labelKey: 'nav.goals' as const },
  { path: '/obligations', icon: Scales, labelKey: 'nav.debts' as const },
  { path: '/insights', icon: ChartLineUp, labelKey: 'nav.insights' as const },
  { path: '/settings', icon: GearSix, labelKey: 'nav.settings' as const },
];

const mobileNavItems = [
  { path: '/dashboard', icon: House, labelKey: 'nav.dashboard' as const },
  { path: '/transactions', icon: ArrowsLeftRight, labelKey: 'nav.transactions' as const },
  { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts' as const },
  { path: '/goals', icon: Target, labelKey: 'nav.goals' as const },
  { path: '/settings', icon: GearSix, labelKey: 'nav.more' as const },
];

export default function AppLayout() {
  const { t, isRTL } = useTranslation();
  const profile = useAppStore((s) => s.profile);
  const sessionMode = useAppStore((s) => s.sessionMode);
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const initials = (profile.name || 'MT')
    .split(' ')
    .map((namePart) => namePart[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${styles.layout} ${isRTL ? styles.rtl : ''}`}>
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>MT</span>
            {!sidebarCollapsed && <span className={styles.logoText}>MoneyTrack</span>}
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={t('nav.toggleSidebar')}
          >
            <List size={20} weight="regular" />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map(({ path, icon: Icon, labelKey }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
            >
              <Icon size={22} weight={location.pathname.startsWith(path) ? 'fill' : 'regular'} />
              {!sidebarCollapsed && <span>{t(labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <div className={styles.avatar}>{initials}</div>
            {!sidebarCollapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{profile.name}</span>
                <span className={styles.userEmail}>{profile.email}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        {sessionMode === 'demo' && (
          <div className={styles.demoBanner}>
            <strong>{t('app.demoMode')}</strong>
            <span>{t('app.demoReadonly')}</span>
          </div>
        )}
        <Outlet />
      </main>

      <nav className={styles.bottomTabs}>
        {mobileNavItems.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.tabActive : ''}`}
          >
            <Icon size={24} weight={location.pathname.startsWith(path) ? 'fill' : 'regular'} />
            <span className={styles.tabLabel}>{t(labelKey)}</span>
          </NavLink>
        ))}
        <NavLink to="/transactions/new" className={styles.fab}>
          <Plus size={24} weight="bold" />
        </NavLink>
      </nav>
    </div>
  );
}
