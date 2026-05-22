import styles from './Badge.module.css';

type BadgeVariant = 'paid' | 'overdue' | 'due_soon' | 'upcoming' | 'active';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  stamp?: boolean;
}

export default function Badge({ variant, children, stamp = false }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${stamp ? styles.stamp : ''}`}>
      {children}
    </span>
  );
}
