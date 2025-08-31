import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  children,
  style,
  ...rest
}) => {
  const base: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontWeight: 600,
    lineHeight: 1.1,
    fontSize: size === 'lg' ? 18 : 16,
    padding: size === 'lg' ? '18px 30px' : '14px 24px',
    borderRadius: 14,
    cursor: 'pointer',
    userSelect: 'none',
    border: '1px solid transparent',
    transition: 'background .2s, transform .15s, box-shadow .2s, border-color .2s',
    boxShadow: '0 4px 18px -4px rgba(0,0,0,.55), 0 1px 0 0 rgba(255,255,255,.04) inset',
    fontFamily: 'inherit',
    width: fullWidth ? '100%' : undefined,
    WebkitTapHighlightColor: 'transparent'
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(90deg,#2563eb,#1d4ed8)',
      color: '#fff',
      borderColor: '#1e3a8a'
    },
    secondary: {
      background: '#1f2731',
      color: '#e6edf3',
      borderColor: '#2d3642'
    },
    ghost: {
      background: 'transparent',
      color: '#60a5fa',
      borderColor: 'rgba(255,255,255,.12)'
    }
  };

  const merged: React.CSSProperties = { ...base, ...variants[variant], ...style };

  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  if (hover) {
    if (variant === 'primary') merged.background = 'linear-gradient(90deg,#3b82f6,#2563eb)';
    else if (variant === 'secondary') merged.background = '#243040';
    else if (variant === 'ghost') merged.background = 'rgba(96,165,250,.08)';
  }
  if (active) {
    merged.transform = 'translateY(2px)';
    merged.boxShadow = '0 2px 10px -2px rgba(0,0,0,.6)';
  }

  return (
    <button
      style={merged}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      {...rest}
    >
      {children}
    </button>
  );
};
