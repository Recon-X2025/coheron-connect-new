import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import './AppraisalForm.css';

interface AppraisalFormProps {
  employees: any[];
  onClose: () => void;
  onSave: () => void;
}

export const AppraisalForm = ({ employees, onClose, onSave }: AppraisalFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content appraisal-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Performance Appraisal</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="appraisal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Employee *</label>
              <select required>
                <option>Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Manager *</label>
              <select required>
                <option>Select Manager</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Appraisal Period *</label>
              <select required>
                <option>Q1 2024</option>
                <option>Q2 2024</option>
                <option>Q3 2024</option>
                <option>Q4 2024</option>
                <option>Annual 2024</option>
              </select>
            </div>
            <div className="form-group">
              <label>Deadline *</label>
              <input type="date" required />
            </div>
          </div>

          <div className="form-group">
            <label>Appraisal Type</label>
            <select>
              <option>Annual Review</option>
              <option>Quarterly Review</option>
              <option>Probation Review</option>
              <option>Promotion Review</option>
            </select>
          </div>

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Appraisal</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

