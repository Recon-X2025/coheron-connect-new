import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/Button';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import './BulkActionModal.css';

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
  confirmText?: string;
  loading?: boolean;
}

export const BulkActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  label,
  placeholder,
  type = 'text',
  options = [],
  confirmText = 'Confirm',
  loading = false,
}: BulkActionModalProps) => {
  const [value, setValue] = useState('');

  useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value);
      setValue('');
    }
  };

  return (
    <div className="bulk-action-modal-overlay" onClick={onClose}>
      <div className="bulk-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bulk-action-modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{label}</label>
            {type === 'select' ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="form-control"
              >
                <option value="">Select an option...</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                required
                className="form-control"
                autoFocus
              />
            )}
          </div>
          <div className="bulk-action-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !value.trim()}>
              {loading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

