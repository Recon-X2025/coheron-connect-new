import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 8000,
};

const MAX_VISIBLE = 5;

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem = ({ toast, onRemove }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const totalDuration = toast.duration || AUTO_DISMISS_MS[toast.type];
  const [progress, setProgress] = useState(100);
  const rafRef = useRef<number | undefined>(undefined);
  const removedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (removedRef.current) return;
    removedRef.current = true;
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  }, [onRemove, toast.id]);

  // Animate entry
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Progress / auto-dismiss loop
  useEffect(() => {
    lastTickRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      if (!paused) {
        elapsedRef.current += now - lastTickRef.current;
      }
      lastTickRef.current = now;

      const remaining = Math.max(0, 1 - elapsedRef.current / totalDuration);
      setProgress(remaining * 100);

      if (remaining <= 0) {
        dismiss();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, totalDuration, dismiss]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div
      className={`toast toast-${toast.type} ${isVisible ? 'toast-visible' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-message">{toast.message}</div>
      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action!.onClick();
            dismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={() => dismiss()}
      >
        <X size={16} />
      </button>
      <div className="toast-progress-track">
        <div
          className={`toast-progress-bar ${paused ? 'toast-progress-paused' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const addToast = (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => {
        const next = [...prev, { ...toast, id }];
        // Keep only the most recent MAX_VISIBLE
        if (next.length > MAX_VISIBLE) {
          return next.slice(next.length - MAX_VISIBLE);
        }
        return next;
      });
    };

    (window as any).showToast = addToast;

    return () => {
      delete (window as any).showToast;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast, idx) => (
        <ToastItem key={toast.id || (toast as any)._id || idx} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

// Helper function for easy use
export const showToast = (
  message: string,
  type: ToastType = 'info',
  action?: ToastAction
) => {
  if ((window as any).showToast) {
    (window as any).showToast({ message, type, action });
  } else {
    alert(message);
  }
};
