import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: string;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ProgressBar({ value, color, label, showValue = false, size = 'md', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`${styles.wrapper} ${className || ''}`}>
      {(label || showValue) && (
        <div className={styles.meta}>
          {label && <span className={styles.label}>{label}</span>}
          {showValue && <span className={styles.value}>{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className={`${styles.track} ${styles[size]}`}>
        <div
          className={styles.fill}
          style={{
            width: `${clamped}%`,
            backgroundColor: color || 'var(--color-accent)',
          }}
        />
      </div>
    </div>
  );
}
