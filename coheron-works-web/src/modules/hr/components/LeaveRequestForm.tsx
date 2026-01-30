import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import './LeaveRequestForm.css';

interface LeaveRequestFormProps {
  onClose: () => void;
  onSave: () => void;
}

export const LeaveRequestForm = ({ onClose, onSave }: LeaveRequestFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    from_date: '',
    to_date: '',
    reason: '',
    contact_during_leave: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fromDate = new Date(formData.from_date);
      const toDate = new Date(formData.to_date);
      const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      await apiService.create('/leave/requests', {
        employee_id: user?.userId || '',
        leave_type: formData.leave_type,
        from_date: formData.from_date,
        to_date: formData.to_date,
        days: days,
        reason: formData.reason,
        contact_during_leave: formData.contact_during_leave,
      });
      onSave();
    } catch (error) {
      console.error('Failed to create leave request:', error);
      showToast('Failed to submit leave request. Please try again.', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content leave-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Leave Request</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="form-group">
            <label>Leave Type *</label>
            <select 
              required 
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
            >
              <option value="annual">Annual Leave (PL)</option>
              <option value="sick">Sick Leave (SL)</option>
              <option value="casual">Casual Leave (CL)</option>
              <option value="earned">Earned Leave</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>From Date *</label>
              <input 
                type="date" 
                required 
                value={formData.from_date}
                onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>To Date *</label>
              <input 
                type="date" 
                required 
                value={formData.to_date}
                onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Reason *</label>
            <textarea 
              rows={4} 
              required 
              placeholder="Enter reason for leave..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            ></textarea>
          </div>

          <div className="form-group">
            <label>Contact During Leave</label>
            <input 
              type="tel" 
              placeholder="Phone number"
              value={formData.contact_during_leave}
              onChange={(e) => setFormData({ ...formData, contact_during_leave: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

