import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import './CourseForm.css';

interface CourseFormProps {
  onClose: () => void;
  onSave: () => void;
}

export const CourseForm = ({ onClose, onSave }: CourseFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content course-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Course</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="course-form">
          <div className="form-group">
            <label>Course Name *</label>
            <input type="text" required placeholder="e.g., React Advanced Development" />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea rows={4} required placeholder="Describe the course content and learning objectives..."></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration (hours) *</label>
              <input type="number" required min="1" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select>
                <option>Technical</option>
                <option>Soft Skills</option>
                <option>Leadership</option>
                <option>Compliance</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Instructor</label>
            <input type="text" placeholder="Instructor name" />
          </div>

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Course</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

