import { splitAmount } from '../../../lib/utils/currency';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import styles from './AmountDisplay.module.css';

interface AmountDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  sign?: '+' | '-' | '';
  showCurrency?: boolean;
  className?: string;
}

export default function AmountDisplay({ amount, size = 'md', sign = '', showCurrency = true, className }: AmountDisplayProps) {
  const { language } = useTranslation();
  const { whole, decimal } = splitAmount(Math.abs(amount));
  const currencyLabel = language === 'ar' ? 'ر.س' : 'SAR';
  const signColor = sign === '+' ? 'positive' : sign === '-' ? 'negative' : '';

  return (
    <span className={`${styles.amount} ${styles[size]} ${signColor ? styles[signColor] : ''} ${className || ''}`}>
      {showCurrency && <span className={styles.currency}>{currencyLabel}</span>}
      {sign && <span className={styles.sign}>{sign === '-' ? '−' : '+'}</span>}
      <span className={styles.whole}>{whole}</span>
      <span className={styles.decimal}>.{decimal}</span>
    </span>
  );
}
