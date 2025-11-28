import React, { useState, useEffect } from 'react';
import { Phone, Mail, MessageSquare, FileText, CheckCircle, User } from 'lucide-react';
import { odooService } from '../../../services/odooService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './ActivityTimeline.css';

export interface Activity {
  id: number;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'log';
  summary: string;
  description?: string;
  date: string;
  user_id: number;
  user_name?: string;
  duration?: number; // in minutes
  state?: 'planned' | 'done' | 'canceled';
}

interface ActivityTimelineProps {
  resId: number; // Resource ID (lead, opportunity, etc.)
  resModel: string; // Resource model (crm.lead, etc.)
  onCreateActivity?: (activity: Partial<Activity>) => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  resId,
  resModel,
  onCreateActivity,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: 'note',
    summary: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    state: 'planned',
  });

  useEffect(() => {
    loadActivities();
  }, [resId, resModel]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      // In Odoo, activities are stored in mail.activity model
      // We'll fetch activities related to this record
      const activityData = await odooService.search<Activity>(
        'mail.activity',
        [
          ['res_id', '=', resId],
          ['res_model', '=', resModel],
        ],
        ['id', 'activity_type_id', 'summary', 'note', 'date_deadline', 'user_id', 'state']
      );

      // Transform Odoo activities to our Activity format
      const transformed = activityData.map((act: any) => ({
        id: act.id,
        type: mapActivityType(act.activity_type_id?.[1] || 'note'),
        summary: act.summary || 'Activity',
        description: act.note || '',
        date: act.date_deadline || new Date().toISOString(),
        user_id: act.user_id?.[0] || 0,
        user_name: act.user_id?.[1] || 'Unknown',
        state: act.state || 'planned',
      }));

      // Sort by date (newest first)
      transformed.sort((a: Activity, b: Activity) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setActivities(transformed);
    } catch (error) {
      console.error('Failed to load activities:', error);
      // Fallback to empty array
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const mapActivityType = (typeName: string): Activity['type'] => {
    const typeMap: Record<string, Activity['type']> = {
      'Call': 'call',
      'Email': 'email',
      'Meeting': 'meeting',
      'Note': 'note',
      'Task': 'task',
    };
    return typeMap[typeName] || 'note';
  };

  const handleCreateActivity = async () => {
    if (!newActivity.summary?.trim()) {
      return;
    }

    try {
      // Create activity in Odoo
      const activityId = await odooService.create('mail.activity', {
        res_id: resId,
        res_model: resModel,
        activity_type_id: getActivityTypeId(newActivity.type || 'note'),
        summary: newActivity.summary,
        note: newActivity.description,
        date_deadline: newActivity.date,
        user_id: 1, // Current user
        state: newActivity.state || 'planned',
      });

      if (onCreateActivity) {
        onCreateActivity({ ...newActivity, id: activityId });
      }

      // Reload activities
      await loadActivities();

      // Reset form
      setNewActivity({
        type: 'note',
        summary: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        state: 'planned',
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  };

  const getActivityTypeId = (type: Activity['type']): number => {
    // This would map to actual Odoo activity type IDs
    // For now, return a default
    const typeMap: Record<Activity['type'], number> = {
      call: 1,
      email: 2,
      meeting: 3,
      note: 4,
      task: 5,
      log: 4,
    };
    return typeMap[type] || 4;
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'call':
        return <Phone size={18} />;
      case 'email':
        return <Mail size={18} />;
      case 'meeting':
        return <User size={18} />;
      case 'task':
        return <CheckCircle size={18} />;
      case 'log':
        return <FileText size={18} />;
      default:
        return <MessageSquare size={18} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="activity-timeline">
        <LoadingSpinner size="small" message="Loading activities..." />
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      <div className="activity-timeline-header">
        <h3>Activity Timeline</h3>
        <button
          className="activity-add-btn"
          onClick={() => setShowForm(!showForm)}
        >
          + Add Activity
        </button>
      </div>

      {showForm && (
        <div className="activity-form">
          <div className="form-row">
            <div className="form-field">
              <label>Type</label>
              <select
                value={newActivity.type}
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as Activity['type'] })}
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
              </select>
            </div>

            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={newActivity.date}
                onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Summary</label>
            <input
              type="text"
              value={newActivity.summary}
              onChange={(e) => setNewActivity({ ...newActivity, summary: e.target.value })}
              placeholder="Activity summary"
            />
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              value={newActivity.description}
              onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
              placeholder="Activity description"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleCreateActivity}>
              Create Activity
            </button>
          </div>
        </div>
      )}

      <div className="activity-list">
        {activities.length === 0 ? (
          <div className="activity-empty">
            <p>No activities yet. Add one to get started!</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon" data-type={activity.type}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  <strong>{activity.summary}</strong>
                  <span className="activity-date">{formatDate(activity.date)}</span>
                </div>
                {activity.description && (
                  <p className="activity-description">{activity.description}</p>
                )}
                <div className="activity-meta">
                  <span className="activity-user">
                    {activity.user_name || 'Unknown User'}
                  </span>
                  {activity.state && (
                    <span className={`activity-state activity-state-${activity.state}`}>
                      {activity.state}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;

