import type { ReactNode, HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  header?: ReactNode;
  headerAction?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export default function Card({ variant = 'default', header, headerAction, padding = 'md', children, className, ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]} ${styles[`pad-${padding}`]} ${className || ''}`} {...props}>
      {(header || headerAction) && (
        <div className={styles.cardHeader}>
          <div className={styles.headerTitle}>{header}</div>
          {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
        </div>
      )}
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}
