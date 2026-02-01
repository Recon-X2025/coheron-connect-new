import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import './ConfirmDialog.css';

type DialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const variantConfig = {
  danger: { icon: Trash2, color: 'var(--danger)' },
  warning: { icon: AlertTriangle, color: 'var(--warning)' },
  info: { icon: HelpCircle, color: 'var(--primary)' },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const focusTrapRef = useFocusTrap(open);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) onCancel();
  }, [open, onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const { icon: Icon, color } = variantConfig[variant];

  return (
    <div className="confirm-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} ref={focusTrapRef}>
        <div className="confirm-icon-wrapper" style={{ backgroundColor: `${color}12` }}>
          <Icon size={24} style={{ color }} />
        </div>
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            ref={cancelRef}
            className="confirm-btn confirm-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-btn confirm-btn-${variant}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for convenient usage
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: DialogVariant;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'danger',
    resolve: null,
  });

  const confirm = useCallback((opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: DialogVariant;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel || 'Confirm',
        variant: opts.variant || 'danger',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const dialogProps = {
    open: state.open,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    variant: state.variant,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return { confirm, dialogProps };
}

// Global confirm function (mirrors window.showToast pattern)
let globalConfirm: ((opts: { title: string; message: string; confirmLabel?: string; variant?: DialogVariant }) => Promise<boolean>) | null = null;

export const setGlobalConfirm = (fn: typeof globalConfirm) => {
  globalConfirm = fn;
};

export const confirmAction = (opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: DialogVariant;
}): Promise<boolean> => {
  if (globalConfirm) return globalConfirm(opts);
  return Promise.resolve(window.confirm(`${opts.title}\n\n${opts.message}`));
};
