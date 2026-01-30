import { useRef, useEffect } from 'react';
import './EditableCell.css';

interface EditableCellProps {
  editing: boolean;
  value: string | number;
  onChange: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
}

export const EditableCell = ({
  editing,
  value,
  onChange,
  onSave,
  onCancel,
  type = 'text',
  options,
}: EditableCellProps) => {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave?.();
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  if (!editing) {
    return <span className="editable-cell-display">{value}</span>;
  }

  if (type === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        className="editable-cell-input editable-cell-select"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className="editable-cell-input"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
};
