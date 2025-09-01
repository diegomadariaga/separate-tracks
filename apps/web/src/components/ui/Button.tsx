import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

/** Pequeño botón estilizado inline sin dependencias de CSS global. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  disabled,
  style,
  ...rest
}, ref) => {
  const styles = baseStyles();
  const variantStyle = styles.variants[variant];
  const sizeStyle = styles.sizes[size];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      ref={ref}
      style={{
        ...styles.base,
        ...variantStyle,
        ...sizeStyle,
        opacity: (disabled || loading) ? 0.6 : 1,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        ...style
      }}
    >
      {icon && <span style={{ display: 'inline-flex', marginRight: children ? 6 : 0 }}>{icon}</span>}
      {loading ? '…' : children}
    </button>
  );
});

Button.displayName = 'Button';

function baseStyles() {
  return {
    base: {
      fontFamily: 'inherit',
      fontWeight: 500,
      border: 'none',
      borderRadius: 8,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1.2,
      transition: 'background .15s ease, color .15s ease',
    } as React.CSSProperties,
    sizes: {
      sm: { fontSize: 12, padding: '6px 10px' },
      md: { fontSize: 14, padding: '8px 14px' },
    } satisfies Record<ButtonSize, React.CSSProperties>,
    variants: {
      primary: { background: '#6366f1', color: '#fff' },
      secondary: { background: '#334155', color: '#f1f5f9' },
      danger: { background: '#b91c1c', color: '#fff' },
      ghost: { background: 'transparent', color: '#f1f5f9' },
    } satisfies Record<ButtonVariant, React.CSSProperties>,
  };
}

export default Button;
