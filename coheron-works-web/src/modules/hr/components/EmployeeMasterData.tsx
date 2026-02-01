import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Download, Upload } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { formatInLakhsCompact } from '../../../utils/currencyFormatter';
import { exportToCSV } from '../../../utils/exportCSV';
import './EmployeeMasterData.css';

export const EmployeeMasterData = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Mock data
  const employees = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      employeeId: 'EMP001',
      department: 'Engineering',
      position: 'Senior Developer',
      hireDate: '2020-01-15',
      ctc: 1500000,
      status: 'Active',
    },
    {
      id: 2,
      name: 'Priya Sharma',
      employeeId: 'EMP002',
      department: 'HR',
      position: 'HR Manager',
      hireDate: '2019-03-20',
      ctc: 1200000,
      status: 'Active',
    },
  ];

  return (
    <div className="employee-master">
      <div className="section-header">
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportToCSV(employees, 'employee-master-data', [
            { key: 'employeeId', label: 'Employee ID' },
            { key: 'name', label: 'Name' },
            { key: 'department', label: 'Department' },
            { key: 'position', label: 'Position' },
            { key: 'hireDate', label: 'Hire Date' },
            { key: 'ctc', label: 'CTC' },
            { key: 'status', label: 'Status' },
          ])}>
            Export
          </Button>
          <Button variant="secondary" icon={<Upload size={18} />}>
            Import
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>
            Add Employee
          </Button>
        </div>
      </div>

      <div className="employee-tabs">
        <button className="tab active">Personal Information</button>
        <button className="tab">Employment Details</button>
        <button className="tab">Salary Structure</button>
        <button className="tab">Bank Details</button>
        <button className="tab">Tax Information</button>
      </div>

      <Card>
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Hire Date</th>
              <th>CTC (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={emp.id || (emp as any)._id || idx}>
                <td>{emp.employeeId}</td>
                <td>{emp.name}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td>{new Date(emp.hireDate).toLocaleDateString()}</td>
                <td>{formatInLakhsCompact(emp.ctc)}</td>
                <td>
                  <span className={`status-badge ${emp.status.toLowerCase()}`}>
                    {emp.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => { setSelectedEmployee(emp); setShowForm(true); }}>
                      <Edit size={16} />
                    </button>
                    <button className="delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showForm && (
        <EmployeeForm
          employee={selectedEmployee}
          onClose={() => {
            setShowForm(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
};

const EmployeeForm = ({ employee, onClose }: { employee?: any; onClose: () => void }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
        <form className="employee-form">
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" defaultValue={employee?.name} required />
              </div>
              <div className="form-group">
                <label>Employee ID *</label>
                <input type="text" defaultValue={employee?.employeeId} required />
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
                <select defaultValue={employee?.department} required>
                  <option>Engineering</option>
                  <option>HR</option>
                  <option>Sales</option>
                  <option>Finance</option>
                </select>
              </div>
              <div className="form-group">
                <label>Position *</label>
                <input type="text" defaultValue={employee?.position} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hire Date *</label>
                <input type="date" defaultValue={employee?.hireDate} required />
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
            <h3>Salary Structure</h3>
            <div className="form-row">
              <div className="form-group">
                <label>CTC (₹) *</label>
                <input type="number" defaultValue={employee?.ctc} required />
              </div>
              <div className="form-group">
                <label>Gross Salary (₹)</label>
                <input type="number" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Bank Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Bank Name</label>
                <input type="text" />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input type="text" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>IFSC Code</label>
                <input type="text" />
              </div>
              <div className="form-group">
                <label>Account Holder Name</label>
                <input type="text" />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Employee</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

