import React from 'react';
import { Button } from '@repo/ui';

export interface UploadProgressProps {
  value: number; // 0-100
  ariaLabel?: string;
  className?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  error?: string | null;
  uploading?: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  value,
  ariaLabel = 'Progreso de subida',
  className,
  onCancel,
  onRetry,
  error,
  uploading = true
}) => {
  return (
    <div className={className} style={{ maxWidth: 520, margin: '18px auto 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 13, letterSpacing: .3 }}>
          {error ? <span style={{ color: '#ef4444' }}>{error}</span> : `${ariaLabel}: ${value}%`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {uploading && onCancel && <Button variant="secondary" size="md" onClick={onCancel}>Cancelar</Button>}
          {!uploading && error && onRetry && <Button size="md" onClick={onRetry}>Reintentar</Button>}
        </div>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span style={{ width: value + '%' }} />
      </div>
    </div>
  );
};
