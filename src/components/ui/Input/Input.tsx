import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import styles from './Input.module.css';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, iconLeft, iconRight, inputSize = 'md', type, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const generatedId = useId();
    const inputId = props.id ?? generatedId;

    return (
      <div className={`${styles.wrapper} ${error ? styles.hasError : ''} ${className || ''}`}>
        {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
        <div className={`${styles.inputWrap} ${styles[inputSize]}`}>
          {iconLeft && <span className={styles.iconLeft}>{iconLeft}</span>}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className={styles.input}
            {...props}
          />
          {isPassword && (
            <button type="button" className={styles.iconRight} onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          )}
          {!isPassword && iconRight && <span className={styles.iconRight}>{iconRight}</span>}
        </div>
        {error && <span className={styles.error}>{error}</span>}
        {!error && helperText && <span className={styles.helper}>{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
