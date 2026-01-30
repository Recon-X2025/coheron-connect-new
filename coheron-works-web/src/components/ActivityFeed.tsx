import React from 'react';
import {
  PlusCircle,
  Edit,
  Trash2,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import './ActivityFeed.css';

export interface Activity {
  id: string;
  user: string;
  action: string;
  entityType: string;
  entityName: string;
  timestamp: string;
  details?: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  created:   { icon: <PlusCircle size={16} />,    color: '#10b981' },
  updated:   { icon: <Edit size={16} />,           color: '#3b82f6' },
  deleted:   { icon: <Trash2 size={16} />,         color: '#ef4444' },
  commented: { icon: <MessageSquare size={16} />,  color: '#8b5cf6' },
  assigned:  { icon: <UserCheck size={16} />,      color: '#f59e0b' },
  completed: { icon: <CheckCircle2 size={16} />,   color: '#10b981' },
  approved:  { icon: <ThumbsUp size={16} />,       color: '#22c55e' },
  rejected:  { icon: <XCircle size={16} />,        color: '#ef4444' },
};

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface ActivityFeedProps {
  activities: Activity[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const displayed = activities.slice(0, 15);
  const config = (action: string) => ACTION_CONFIG[action] || ACTION_CONFIG['updated'];

  return (
    <div className="activity-feed">
      <ul className="activity-feed-list">
        {displayed.map((item) => {
          const { icon, color } = config(item.action);
          return (
            <li key={item.id} className="activity-feed-item">
              <span className="activity-feed-icon" style={{ backgroundColor: `${color}18`, color }}>
                {icon}
              </span>
              <span className="activity-feed-avatar" title={item.user}>
                {getInitials(item.user)}
              </span>
              <span className="activity-feed-text">
                <strong>{item.user}</strong> {item.action}{' '}
                {item.entityType} <strong>{item.entityName}</strong>
                {item.details && <span className="activity-feed-details"> — {item.details}</span>}
              </span>
              <span className="activity-feed-time">{getRelativeTime(item.timestamp)}</span>
            </li>
          );
        })}
      </ul>
      {activities.length > 15 && (
        <div className="activity-feed-footer">
          <a href="#view-all" className="activity-feed-view-all">View all</a>
        </div>
      )}
    </div>
  );
};
