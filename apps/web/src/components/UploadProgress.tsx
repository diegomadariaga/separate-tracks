import React from 'react';

export interface UploadProgressProps {
  value: number; // 0-100
  ariaLabel?: string;
  className?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ value, ariaLabel = 'Progreso de subida', className }) => {
  return (
    <div className={className} style={{ maxWidth: 480, margin: '18px auto 0' }}>
      <div style={{ fontSize: 13, letterSpacing: .3 }}>{ariaLabel}: {value}%</div>
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span style={{ width: value + '%' }} />
      </div>
    </div>
  );
};
