import * as React from 'react';
import { Button } from './ui/Button.js';

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

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  danger
}) => {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const firstBtnRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab') {
        // focus trap
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
        if (!focusable || focusable.length === 0) return;
        const list = Array.from(focusable);
        const idx = list.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && (idx === 0 || idx === -1)) {
          e.preventDefault();
          list[list.length - 1].focus();
        } else if (!e.shiftKey && idx === list.length - 1) {
          e.preventDefault();
          list[0].focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    // initial focus
    setTimeout(() => { firstBtnRef.current?.focus(); }, 0);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div style={backdropStyle}>
      <div
        ref={dialogRef}
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h4 id="confirm-title" style={headingStyle}>{title}</h4>
        <div style={messageStyle}>{message}</div>
        <div style={actionsRowStyle}>
          <Button
            ref={firstBtnRef as any}
            onClick={onCancel}
            variant="secondary"
            size="md"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant={danger ? 'danger' : 'primary'}
            size="md"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  animation: 'fadeIn .12s ease'
};

const modalStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#f1f5f9',
  padding: '20px 24px',
  borderRadius: 12,
  width: 'min(420px, 90%)',
  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.6)',
  transform: 'translateY(4px)',
  animation: 'popIn .18s ease'
};

const headingStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 18 };
const messageStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.4, marginBottom: 20, whiteSpace: 'pre-line' };
const actionsRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 12 };

export default ConfirmModal;

// Simple keyframes injection (once)
if (typeof document !== 'undefined' && !document.getElementById('cfm-modal-anim')) {
  const style = document.createElement('style');
  style.id = 'cfm-modal-anim';
  style.innerHTML = `@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }\n@keyframes popIn { from { opacity:0; transform:translateY(12px) scale(.96); } to { opacity:1; transform:translateY(4px) scale(1); } }`;
  document.head.appendChild(style);
}
