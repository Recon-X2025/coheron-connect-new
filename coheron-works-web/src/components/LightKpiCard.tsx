// components/LightKpiCard.tsx
// Light-mode-only KPI card component using CSS variables

import React from 'react';
import './LightKpiCard.css';

interface LightKpiCardProps {
  title: string;
  value: string | number;
  delta?: number;
  icon?: React.ReactNode;
}

export default function LightKpiCard({ title, value, delta, icon }: LightKpiCardProps) {
  return (
    <div className="light-kpi-card">
      <div className="light-kpi-card__header">
        <div className="light-kpi-card__content">
          <div className="light-kpi-card__title">{title}</div>
          <div className="light-kpi-card__value">{value}</div>
        </div>
        {icon && <div className="light-kpi-card__icon">{icon}</div>}
      </div>
      {typeof delta !== 'undefined' && (
        <div className="light-kpi-card__delta">
          <span
            className={`light-kpi-card__delta-badge ${
              delta > 0 ? 'light-kpi-card__delta-badge--success' : 'light-kpi-card__delta-badge--danger'
            }`}
          >
            {delta > 0 ? `▲ ${delta}%` : `▼ ${Math.abs(delta)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

