import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...rest }) => {
  const style: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    fontWeight: 500,
    background: variant === 'primary' ? '#2563eb' : '#e2e8f0',
    color: variant === 'primary' ? '#fff' : '#111',
    borderColor: variant === 'primary' ? '#1d4ed8' : '#cbd5e1'
  };
  return <button style={style} {...rest}>{children}</button>;
};
