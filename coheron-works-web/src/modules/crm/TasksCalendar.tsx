import { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, Search, List, Grid } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { crmService, type Task, type CalendarEvent } from '../../services/crmService';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './TasksCalendar.css';

type ViewMode = 'tasks' | 'calendar';
type TaskView = 'list' | 'kanban';

export const TasksCalendar = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [taskView, setTaskView] = useState<TaskView>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    state: '',
    task_type: '',
    priority: '',
    assigned_to_id: '',
    search: '',
  });

  useEffect(() => {
    if (viewMode === 'tasks') {
      loadTasks();
    } else {
      loadEvents();
    }
    loadUsers();
  }, [viewMode, filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {
        state: filters.state || undefined,
        task_type: filters.task_type || undefined,
        priority: filters.priority || undefined,
      };
      if (filters.assigned_to_id) params.assigned_to_id = parseInt(filters.assigned_to_id);
      const data = await crmService.getTasks(params);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      const data = await crmService.getCalendarEvents({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiService.get<any>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCompleteTask = async (id: number) => {
    try {
      await crmService.completeTask(id);
      loadTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
      showToast('Failed to complete task', 'error');
    }
  };

  const handleCancelTask = async (id: number) => {
    if (!confirm('Cancel this task?')) return;
    try {
      await crmService.cancelTask(id);
      loadTasks();
    } catch (error) {
      console.error('Failed to cancel task:', error);
      showToast('Failed to cancel task', 'error');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; class: string; icon: any }> = {
      low: { label: 'Low', class: 'badge-gray', icon: CheckCircle },
      medium: { label: 'Medium', class: 'badge-blue', icon: Clock },
      high: { label: 'High', class: 'badge-orange', icon: AlertCircle },
      urgent: { label: 'Urgent', class: 'badge-red', icon: AlertCircle },
    };
    return badges[priority] || { label: priority, class: 'badge-gray', icon: Clock };
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      planned: { label: 'Planned', class: 'badge-blue' },
      in_progress: { label: 'In Progress', class: 'badge-yellow' },
      done: { label: 'Done', class: 'badge-green' },
      canceled: { label: 'Canceled', class: 'badge-gray' },
    };
    return badges[state] || { label: state, class: 'badge-gray' };
  };

  const getTaskTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: '📞',
      email: '📧',
      meeting: '🤝',
      note: '📝',
      todo: '✓',
      follow_up: '🔄',
    };
    return icons[type] || '•';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="tasks-calendar">
      <div className="tasks-calendar-header">
        <h2>Tasks & Calendar</h2>
        <div className="header-actions">
          <div className="view-switcher">
            <button
              type="button"
              className={viewMode === 'tasks' ? 'active' : ''}
              onClick={() => setViewMode('tasks')}
            >
              <List size={18} />
              Tasks
            </button>
            <button
              type="button"
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar size={18} />
              Calendar
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (viewMode === 'tasks') {
                setSelectedTask(null);
                setShowTaskForm(true);
              } else {
                setSelectedEvent(null);
                setShowEventForm(true);
              }
            }}
          >
            <Plus size={16} />
            {viewMode === 'tasks' ? 'New Task' : 'New Event'}
          </Button>
        </div>
      </div>

      {viewMode === 'tasks' ? (
        <div className="tasks-view">
          <div className="tasks-toolbar">
            <div className="filters">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              >
                <option value="">All States</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="canceled">Canceled</option>
              </select>
              <select
                value={filters.task_type}
                onChange={(e) => setFilters({ ...filters, task_type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="todo">Todo</option>
                <option value="follow_up">Follow Up</option>
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="view-toggle">
              <button
                type="button"
                className={taskView === 'list' ? 'active' : ''}
                onClick={() => setTaskView('list')}
              >
                <List size={18} />
              </button>
              <button
                type="button"
                className={taskView === 'kanban' ? 'active' : ''}
                onClick={() => setTaskView('kanban')}
              >
                <Grid size={18} />
              </button>
            </div>
          </div>

          {taskView === 'list' ? (
            <div className="tasks-list">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Type</th>
                    <th>Related To</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>State</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-state">
                        <CheckCircle size={48} />
                        <p>No tasks found</p>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task, idx) => {
                      const priorityBadge = getPriorityBadge(task.priority);
                      const stateBadge = getStateBadge(task.state);
                      const PriorityIcon = priorityBadge.icon;
                      return (
                        <tr key={task.id || (task as any)._id || idx}>
                          <td>
                            <div className="task-name">
                              <span className="task-icon">{getTaskTypeIcon(task.task_type)}</span>
                              <div>
                                <strong>{task.name}</strong>
                                {task.description && (
                                  <p className="task-description">{task.description.substring(0, 50)}...</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{task.task_type}</td>
                          <td>{task.related_name || '-'}</td>
                          <td>{task.assigned_to_name || task.user_name}</td>
                          <td>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                          </td>
                          <td>
                            <span className={`priority-badge ${priorityBadge.class}`}>
                              <PriorityIcon size={14} />
                              {priorityBadge.label}
                            </span>
                          </td>
                          <td>
                            <span className={`state-badge ${stateBadge.class}`}>{stateBadge.label}</span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              {task.state !== 'done' && (
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Complete"
                                  onClick={() => handleCompleteTask(task.id)}
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              {task.state !== 'canceled' && task.state !== 'done' && (
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Cancel"
                                  onClick={() => handleCancelTask(task.id)}
                                >
                                  <AlertCircle size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tasks-kanban">
              {['planned', 'in_progress', 'done'].map((state) => {
                const stateTasks = tasks.filter(t => t.state === state);
                return (
                  <div key={state} className="kanban-column">
                    <div className="kanban-header">
                      <h3>{getStateBadge(state).label}</h3>
                      <span className="task-count">{stateTasks.length}</span>
                    </div>
                    <div className="kanban-items">
                      {stateTasks.map((task, idx) => {
                        const priorityBadge = getPriorityBadge(task.priority);
                        const PriorityIcon = priorityBadge.icon;
                        return (
                          <div key={task.id || (task as any)._id || idx} className="kanban-card">
                            <div className="kanban-card-header">
                              <span className="task-icon">{getTaskTypeIcon(task.task_type)}</span>
                              <span className={`priority-badge ${priorityBadge.class}`}>
                                <PriorityIcon size={12} />
                              </span>
                            </div>
                            <div className="kanban-card-body">
                              <strong>{task.name}</strong>
                              {task.description && (
                                <p className="task-description">{task.description.substring(0, 100)}</p>
                              )}
                            </div>
                            <div className="kanban-card-footer">
                              <span className="assigned-to">{task.assigned_to_name || task.user_name}</span>
                              {task.due_date && (
                                <span className="due-date">
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="kanban-card-actions">
                              {task.state !== 'done' && (
                                <button
                                  type="button"
                                  className="action-btn"
                                  onClick={() => handleCompleteTask(task.id)}
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="calendar-view">
          <div className="calendar-container">
            <div className="calendar-header">
              <button type="button">← Prev</button>
              <h3>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <button type="button">Next →</button>
            </div>
            <div className="calendar-grid">
              {/* Calendar grid would be implemented here */}
              <div className="calendar-placeholder">
                <Calendar size={64} />
                <p>Calendar view implementation</p>
                <p>Events: {events.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTaskForm && (
        <TaskForm
          task={selectedTask || undefined}
          users={users}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
          onSuccess={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
            loadTasks();
          }}
        />
      )}

      {showEventForm && (
        <EventForm
          event={selectedEvent || undefined}
          users={users}
          onClose={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
            loadEvents();
          }}
        />
      )}
    </div>
  );
};

// Task Form Component
interface TaskFormProps {
  task?: Task;
  users: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const TaskForm = ({ task, users, onClose, onSuccess }: TaskFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    task_type: task?.task_type || 'todo',
    assigned_to_id: task?.assigned_to_id?.toString() || '',
    due_date: task?.due_date || '',
    reminder_date: task?.reminder_date || '',
    priority: task?.priority || 'medium',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (task) {
        await crmService.updateTask(task.id, formData as any);
      } else {
        await crmService.createTask(formData as any);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save task:', error);
      showToast('Failed to save task', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task ? 'Edit Task' : 'Create Task'}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Task Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value as any })}
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="todo">Todo</option>
                <option value="follow_up">Follow Up</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Assigned To</label>
              <select
                value={formData.assigned_to_id}
                onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map((user, idx) => (
                  <option key={user.id || (user as any)._id || idx} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Reminder Date</label>
            <input
              type="datetime-local"
              value={formData.reminder_date}
              onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update' : 'Create'} Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Event Form Component
interface EventFormProps {
  event?: CalendarEvent;
  users: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const EventForm = ({ event, onClose, onSuccess }: EventFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: event?.name || '',
    description: event?.description || '',
    start_date: event?.start_date || '',
    end_date: event?.end_date || '',
    all_day: event?.all_day || false,
    event_type: event?.event_type || 'meeting',
    location: event?.location || '',
    reminder_minutes: event?.reminder_minutes || 15,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (event) {
        await crmService.updateCalendarEvent(event.id, formData as any);
      } else {
        await crmService.createCalendarEvent(formData as any);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save event:', error);
      showToast('Failed to save event', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{event ? 'Edit Event' : 'Create Event'}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date/Time *</label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date/Time *</label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.all_day}
                onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
              />
              All Day Event
            </label>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Event Type</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
              >
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="task">Task</option>
                <option value="reminder">Reminder</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Reminder (minutes before)</label>
              <input
                type="number"
                value={formData.reminder_minutes}
                onChange={(e) => setFormData({ ...formData, reminder_minutes: parseInt(e.target.value) || 15 })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Meeting location"
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : event ? 'Update' : 'Create'} Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

