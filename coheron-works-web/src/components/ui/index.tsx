import React from 'react';
import { clsx } from 'clsx';
import './ui.css';

// ============================================
// BUTTON (Enhanced)
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, iconPosition = 'left', fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'ui-btn',
          `ui-btn-${variant}`,
          `ui-btn-${size}`,
          fullWidth && 'ui-btn-full',
          (disabled || loading) && 'ui-btn-disabled',
          className
        )}
        {...props}
      >
        {loading ? (
          <svg className="ui-btn-spinner" viewBox="0 0 24 24" width="20" height="20">
            <circle className="ui-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
            <path className="ui-spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
          </svg>
        ) : icon && iconPosition === 'left' ? icon : null}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ============================================
// CARD
// ============================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'module';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'solid', padding = 'md', hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'ui-card',
          `ui-card-${variant}`,
          `ui-card-pad-${padding}`,
          hover && 'ui-card-hover',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// ============================================
// INPUT
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="ui-input-wrapper">
        {label && <label className="ui-input-label">{label}</label>}
        <div className="ui-input-container">
          {leftIcon && <div className="ui-input-icon ui-input-icon-left">{leftIcon}</div>}
          <input
            ref={ref}
            className={clsx(
              'ui-input',
              leftIcon && 'ui-input-with-left-icon',
              rightIcon && 'ui-input-with-right-icon',
              error && 'ui-input-error',
              className
            )}
            {...props}
          />
          {rightIcon && <div className="ui-input-icon ui-input-icon-right">{rightIcon}</div>}
        </div>
        {error && <p className="ui-input-error-text">{error}</p>}
        {helperText && !error && <p className="ui-input-helper">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ============================================
// BADGE
// ============================================

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'primary', size = 'md', children, ...props }) => {
  return (
    <span className={clsx('ui-badge', `ui-badge-${variant}`, `ui-badge-${size}`, className)} {...props}>
      {children}
    </span>
  );
};

// ============================================
// KPI CARD
// ============================================

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, change, changeLabel, icon, trend, loading }) => {
  if (loading) {
    return (
      <div className="ui-card ui-card-solid ui-card-pad-md">
        <div className="skeleton" style={{ height: 16, width: 96, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 32, width: 128, borderRadius: 4, marginTop: 8 }} />
        <div className="skeleton" style={{ height: 16, width: 80, borderRadius: 4, marginTop: 8 }} />
      </div>
    );
  }

  return (
    <div className="ui-card ui-card-solid ui-card-pad-md ui-kpi-card">
      <div className="ui-kpi-header">
        <div>
          <p className="ui-kpi-label">{title}</p>
          <p className="ui-kpi-value">{value}</p>
          {change !== undefined && (
            <div className="ui-kpi-change-row">
              <span className={clsx('ui-kpi-change', trend === 'up' && 'ui-kpi-up', trend === 'down' && 'ui-kpi-down')}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && <span className="ui-kpi-change-label">{changeLabel}</span>}
            </div>
          )}
        </div>
        {icon && <div className="ui-kpi-icon">{icon}</div>}
      </div>
    </div>
  );
};

// ============================================
// AVATAR
// ============================================

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, name, size = 'md', status, className, ...props }) => {
  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={clsx('ui-avatar-wrapper', className)} {...props}>
      {src ? (
        <img src={src} alt={alt || name} className={clsx('ui-avatar', `ui-avatar-${size}`)} />
      ) : (
        <div className={clsx('ui-avatar', `ui-avatar-${size}`, 'ui-avatar-initials')}>
          {name ? getInitials(name) : '?'}
        </div>
      )}
      {status && <span className={clsx('ui-avatar-status', `ui-avatar-status-${status}`)} />}
    </div>
  );
};

// ============================================
// PROGRESS BAR
// ============================================

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, size = 'md', color = 'primary', showLabel, label }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="ui-progress-wrapper">
      {(showLabel || label) && (
        <div className="ui-progress-header">
          <span className="ui-progress-label">{label}</span>
          {showLabel && <span className="ui-progress-pct">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={clsx('ui-progress-bar', `ui-progress-${size}`)}>
        <div className={clsx('ui-progress-fill', `ui-progress-fill-${color}`)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ============================================
// COHERON LOGO
// ============================================

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const CoheronLogo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconSizes = { sm: 24, md: 32, lg: 40 };
  const textSizes = { sm: '1.125rem', md: '1.25rem', lg: '1.5rem' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={iconSizes[size]} height={iconSizes[size]} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="20" cy="20" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="20" cy="20" r="4" fill="#FFFFFF" />
      </svg>
      {showText && (
        <span style={{ fontWeight: 600, letterSpacing: '0.05em', color: '#FFFFFF', fontSize: textSizes[size] }}>
          C<span style={{ color: '#00C971' }}>O</span>HERON
        </span>
      )}
    </div>
  );
};

export default { Button, Card, Input, Badge, KPICard, Avatar, ProgressBar, CoheronLogo };
