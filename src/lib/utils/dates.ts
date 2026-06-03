import {
  addMonths,
  differenceInDays,
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isThisMonth,
  isThisWeek,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns';
import { enUS } from 'date-fns/locale';

type Locale = 'en' | 'ar';

function getLocale(locale: Locale) {
  void locale;
  return enUS;
}

export function formatDate(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMM yyyy', { locale: getLocale(locale) });
}

export function formatDateShort(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return format(date, 'd MMM', { locale: getLocale(locale) });
}

export function formatMonthYear(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return format(date, 'MMMM yyyy', { locale: getLocale(locale) });
}

export function formatRelative(dateStr: string, locale: Locale = 'en'): string {
  const date = parseISO(dateStr);
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: getLocale(locale),
  });
}

export function getDueStatus(dateStr: string): 'overdue' | 'due_today' | 'due_tomorrow' | 'due_soon' | 'upcoming' {
  const date = parseISO(dateStr);
  const now = new Date();

  if (isBefore(date, now) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'due_today';
  if (isTomorrow(date)) return 'due_tomorrow';
  if (differenceInDays(date, now) <= 7) return 'due_soon';
  return 'upcoming';
}

export function getDueLabel(dateStr: string, locale: Locale = 'en'): string {
  const status = getDueStatus(dateStr);
  const days = differenceInDays(parseISO(dateStr), new Date());

  const labels: Record<string, string> = {
    overdue: `Overdue by ${Math.abs(days)} days`,
    due_today: 'Due today',
    due_tomorrow: 'Due tomorrow',
    due_soon: `Due in ${days} days`,
    upcoming: formatDate(dateStr, locale),
  };

  return labels[status];
}

export function isPastDue(dateStr: string): boolean {
  return isBefore(parseISO(dateStr), new Date()) && !isToday(parseISO(dateStr));
}

export function isCurrentMonth(dateStr: string): boolean {
  return isThisMonth(parseISO(dateStr));
}

export function isCurrentWeek(dateStr: string): boolean {
  return isThisWeek(parseISO(dateStr));
}

export function generateMonthlyDates(startDate: string, count: number): string[] {
  const start = parseISO(startDate);
  return Array.from({ length: count }, (_, index) =>
    addMonths(start, index).toISOString().split('T')[0]
  );
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function toInputDate(dateStr: string): string {
  return dateStr.split('T')[0];
}

export { isAfter, isBefore, isToday, differenceInDays, parseISO };
