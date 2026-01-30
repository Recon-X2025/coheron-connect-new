import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || <Inbox size={48} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {actionLabel && onAction && (
        <div className="empty-state-action">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
};
