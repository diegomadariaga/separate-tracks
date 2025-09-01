import * as React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, title, message, confirmText='Confirmar', cancelText='Cancelar', onConfirm, onCancel, danger }) => {
  if (!open) return null;
  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h4 id="confirm-title" style={{ margin: '0 0 12px', fontSize: 18 }}>{title}</h4>
        <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 20, whiteSpace: 'pre-line' }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onCancel} style={btnSecondary}>{cancelText}</button>
          <button onClick={onConfirm} style={{ ...btnPrimary, background: danger ? '#b91c1c' : btnPrimary.background }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  background: '#1e293b', color: '#f1f5f9', padding: '20px 24px', borderRadius: 12, width: 'min(420px, 90%)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.6)'
};

const baseBtn: React.CSSProperties = {
  cursor: 'pointer', fontSize: 14, padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 500
};

const btnSecondary: React.CSSProperties = {
  ...baseBtn, background: '#334155', color: '#f1f5f9'
};

const btnPrimary: React.CSSProperties = {
  ...baseBtn, background: '#2563eb', color: '#fff'
};

export default ConfirmModal;
