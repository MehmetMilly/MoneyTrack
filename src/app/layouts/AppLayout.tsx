// ============================================
// MoneyTrack — App Shell & Layout
// Desktop sidebar + Mobile bottom tabs
// ============================================

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  House, Wallet, ArrowsLeftRight, Scales, Target,
  ChartLineUp, GearSix, Plus, List
} from '@phosphor-icons/react';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useAppStore } from '../../lib/data/store';
import styles from './AppLayout.module.css';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', icon: House, labelKey: 'nav.dashboard' as const },
  { path: '/transactions', icon: ArrowsLeftRight, labelKey: 'nav.transactions' as const },
  { path: '/accounts', icon: Wallet, labelKey: 'nav.accounts' as const },
  { path: '/goals', icon: Target, labelKey: 'nav.goals' as const },
  { path: '/obligations', icon: Scales, labelKey: 'nav.debts' as const },
  { path: '/insights', icon: ChartLineUp, labelKey: 'nav.insights' as const },
  { path: '/settings', icon: GearSix, labelKey: 'nav.settings' as const },
];

// Mobile bottom tabs show a subset
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
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const initials = (profile.name || 'MT')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${styles.layout} ${isRTL ? styles.rtl : ''}`}>
      {/* Desktop Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◈</span>
            {!sidebarCollapsed && <span className={styles.logoText}>MoneyTrack</span>}
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            <List size={20} weight="regular" />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map(({ path, icon: Icon, labelKey }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
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

      {/* Main Content */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Mobile Bottom Tabs */}
      <nav className={styles.bottomTabs}>
        {mobileNavItems.map(({ path, icon: Icon, labelKey }) => {
          // Special center FAB for "add"
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `${styles.tabItem} ${isActive ? styles.tabActive : ''}`
              }
            >
              <Icon size={24} weight={location.pathname.startsWith(path) ? 'fill' : 'regular'} />
              <span className={styles.tabLabel}>{t(labelKey)}</span>
            </NavLink>
          );
        })}
        {/* Center FAB */}
        <NavLink to="/transactions/new" className={styles.fab}>
          <Plus size={24} weight="bold" />
        </NavLink>
      </nav>
    </div>
  );
}
