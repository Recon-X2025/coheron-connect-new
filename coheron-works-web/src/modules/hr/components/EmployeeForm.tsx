import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import type { Employee } from '../../../types/odoo';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import './EmployeeForm.css';

interface EmployeeFormProps {
  employee?: Employee;
  onClose: () => void;
  onSave: () => void;
}

export const EmployeeForm = ({ employee, onClose, onSave }: EmployeeFormProps) => {
  useModalDismiss(true, onClose);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle save logic
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content employee-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="employee-form">
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" defaultValue={employee?.name} required />
              </div>
              <div className="form-group">
                <label>Employee ID *</label>
                <input type="text" defaultValue={employee?.id?.toString()} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" />
              </div>
              <div className="form-group">
                <label>PAN Number</label>
                <input type="text" placeholder="ABCDE1234F" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Employment Details</h3>
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
                <label>Job Title *</label>
                <input type="text" defaultValue={employee?.job_title} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hire Date *</label>
                <input type="date" required />
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
          </div>

          <div className="form-section">
            <h3>Contact Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Work Email *</label>
                <input type="email" defaultValue={employee?.work_email} required />
              </div>
              <div className="form-group">
                <label>Work Phone *</label>
                <input type="tel" defaultValue={employee?.work_phone} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Personal Email</label>
                <input type="email" />
              </div>
              <div className="form-group">
                <label>Personal Phone</label>
                <input type="tel" />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Employee</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

