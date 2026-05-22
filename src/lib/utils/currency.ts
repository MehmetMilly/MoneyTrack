// ============================================
// MoneyTrack — Currency Utilities
// ============================================

const SAR_FORMATTER = new Intl.NumberFormat('en-SA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SAR_FORMATTER_AR = new Intl.NumberFormat('ar-SA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SAR_COMPACT = new Intl.NumberFormat('en-SA', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Format a number as SAR currency.
 * Returns "12,540.75" (without the SAR prefix — we show that separately)
 */
export function formatAmount(amount: number, locale: 'en' | 'ar' = 'en'): string {
  const formatter = locale === 'ar' ? SAR_FORMATTER_AR : SAR_FORMATTER;
  return formatter.format(amount);
}

/**
 * Format with SAR prefix: "SAR 12,540.75"
 */
export function formatSAR(amount: number, locale: 'en' | 'ar' = 'en'): string {
  const formatted = formatAmount(amount, locale);
  if (locale === 'ar') {
    return `${formatted} ر.س`;
  }
  return `SAR ${formatted}`;
}

/**
 * Format compact: "12.5K" for large numbers
 */
export function formatCompact(amount: number): string {
  return SAR_COMPACT.format(amount);
}

/**
 * Split amount into whole and decimal parts for styled display
 */
export function splitAmount(amount: number): { whole: string; decimal: string } {
  const formatted = formatAmount(amount);
  const parts = formatted.split('.');
  return {
    whole: parts[0],
    decimal: parts[1] || '00',
  };
}

/**
 * Get sign prefix for amount display
 */
export function getAmountSign(amount: number, type?: 'income' | 'expense'): string {
  if (type === 'income') return '+';
  if (type === 'expense') return '−';
  return amount >= 0 ? '+' : '−';
}

/**
 * Parse a currency string back to number
 */
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}
