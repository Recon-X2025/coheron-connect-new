import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import './JobPostingForm.css';

interface JobPostingFormProps {
  onClose: () => void;
  onSave: () => void;
}

export const JobPostingForm = ({ onClose, onSave }: JobPostingFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content job-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Post New Job</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="job-form">
          <div className="form-group">
            <label>Job Title *</label>
            <input type="text" required placeholder="e.g., Senior Full Stack Developer" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department *</label>
              <select required>
                <option>Engineering</option>
                <option>HR</option>
                <option>Sales</option>
                <option>Finance</option>
              </select>
            </div>
            <div className="form-group">
              <label>Employment Type</label>
              <select>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Experience Required</label>
              <input type="text" placeholder="e.g., 3-5 years" />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" placeholder="e.g., Bangalore, India" />
            </div>
          </div>

          <div className="form-group">
            <label>Job Description *</label>
            <textarea rows={6} required placeholder="Describe the role, responsibilities, and requirements..."></textarea>
          </div>

          <div className="form-group">
            <label>Required Skills</label>
            <input type="text" placeholder="e.g., React, Node.js, PostgreSQL" />
          </div>

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Post Job</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

