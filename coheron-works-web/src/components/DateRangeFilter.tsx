import { useMemo } from 'react';
import './DateRangeFilter.css';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  onClear: () => void;
}

type PresetKey = 'today' | 'last7' | 'last30' | 'month' | 'quarter';

const getPresetRange = (key: PresetKey): [string, string] => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (key) {
    case 'today':
      return [fmt(today), fmt(today)];
    case 'last7': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return [fmt(start), fmt(today)];
    }
    case 'last30': {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return [fmt(start), fmt(today)];
    }
    case 'month':
      return [fmt(new Date(today.getFullYear(), today.getMonth(), 1)), fmt(today)];
    case 'quarter': {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      return [fmt(new Date(today.getFullYear(), qMonth, 1)), fmt(today)];
    }
  }
};

const presets: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
];

export const DateRangeFilter = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onClear,
}: DateRangeFilterProps) => {
  const activePreset = useMemo(() => {
    for (const p of presets) {
      const [s, e] = getPresetRange(p.key);
      if (s === startDate && e === endDate) return p.key;
    }
    return null;
  }, [startDate, endDate]);

  const applyPreset = (key: PresetKey) => {
    const [s, e] = getPresetRange(key);
    onStartChange(s);
    onEndChange(e);
  };

  const hasValue = startDate || endDate;

  return (
    <div className="date-range-filter">
      <div className="date-range-inputs">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          aria-label="Start date"
        />
        <span className="date-range-separator">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          aria-label="End date"
        />
      </div>
      <div className="date-range-presets">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            className={activePreset === p.key ? 'active' : ''}
            onClick={() => applyPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {hasValue && (
        <button type="button" className="date-range-clear" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
};
