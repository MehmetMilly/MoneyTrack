// ============================================
// MoneyTrack — Date Utilities
// ============================================

import { format, formatDistanceToNow, isAfter, isBefore, isToday, isTomorrow, isThisWeek, isThisMonth, addMonths, differenceInDays, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

type Locale = 'en' | 'ar';

function getLocale(locale: Locale) {
  return locale === 'ar' ? ar : enUS;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMM yyyy', { locale: getLocale(locale) });
}

/**
 * Format a date for short display (e.g., "20 May")
 */
export function formatDateShort(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMM', { locale: getLocale(locale) });
}

/**
 * Format a date for month/year display (e.g., "May 2026")
 */
export function formatMonthYear(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return format(date, 'MMMM yyyy', { locale: getLocale(locale) });
}

/**
 * Get relative time (e.g., "2 days ago", "in 3 days")
 */
export function formatRelative(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: getLocale(locale),
  });
}

/**
 * Get urgency label for due dates
 */
export function getDueStatus(dateStr: string): 'overdue' | 'due_today' | 'due_tomorrow' | 'due_soon' | 'upcoming' {
  const date = parseISO(dateStr);
  const now = new Date();

  if (isBefore(date, now) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'due_today';
  if (isTomorrow(date)) return 'due_tomorrow';
  if (differenceInDays(date, now) <= 7) return 'due_soon';
  return 'upcoming';
}

/**
 * Get due label text
 */
export function getDueLabel(dateStr: string, locale: Locale = 'en'): string {
  const status = getDueStatus(dateStr);
  const days = differenceInDays(parseISO(dateStr), new Date());

  const labels: Record<string, Record<Locale, string>> = {
    overdue: { en: `Overdue by ${Math.abs(days)} days`, ar: `متأخر ${Math.abs(days)} أيام` },
    due_today: { en: 'Due today', ar: 'مستحق اليوم' },
    due_tomorrow: { en: 'Due tomorrow', ar: 'مستحق غداً' },
    due_soon: { en: `Due in ${days} days`, ar: `مستحق خلال ${days} أيام` },
    upcoming: { en: formatDate(dateStr, locale), ar: formatDate(dateStr, locale) },
  };

  return labels[status][locale];
}

/**
 * Check if a date is in the past
 */
export function isPastDue(dateStr: string): boolean {
  return isBefore(parseISO(dateStr), new Date()) && !isToday(parseISO(dateStr));
}

/**
 * Check if a date is within this month
 */
export function isCurrentMonth(dateStr: string): boolean {
  return isThisMonth(parseISO(dateStr));
}

/**
 * Check if a date is within this week
 */
export function isCurrentWeek(dateStr: string): boolean {
  return isThisWeek(parseISO(dateStr));
}

/**
 * Generate future monthly dates
 */
export function generateMonthlyDates(startDate: string, count: number): string[] {
  const start = parseISO(startDate);
  return Array.from({ length: count }, (_, i) =>
    addMonths(start, i).toISOString().split('T')[0]
  );
}

/**
 * Get today's date as ISO string
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format ISO date to input-compatible format
 */
export function toInputDate(dateStr: string): string {
  return dateStr.split('T')[0];
}

export { isAfter, isBefore, isToday, differenceInDays, parseISO };
