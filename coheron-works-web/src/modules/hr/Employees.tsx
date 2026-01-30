import { useState, useEffect } from 'react';
import { 
  Search, Users, Plus, Edit, Trash2, Download, Upload, 
  Phone, Mail, Building2,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { EmployeeDetailView } from './components/EmployeeDetailView';
import { EmployeeForm } from './components/EmployeeForm';
import { confirmAction } from '../../components/ConfirmDialog';
import { exportToCSV } from '../../utils/exportCSV';
import './Employees.css';

type ViewMode = 'list' | 'grid' | 'detail';
type EmployeeTab = 'all' | 'active' | 'inactive' | 'onboarding' | 'offboarding';

export const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<EmployeeTab>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeesData = await apiService.get<any>('/employees');
      setEmployees(employeesData);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.work_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'active' && emp.attendance_state === 'checked_in') ||
      (activeTab === 'inactive' && emp.attendance_state === 'checked_out');
    
    const matchesDept = 
      filterDepartment === 'all' || 
      emp.department_id?.toString() === filterDepartment;

    return matchesSearch && matchesTab && matchesDept;
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.attendance_state === 'checked_in').length,
    inactive: employees.filter(e => e.attendance_state === 'checked_out').length,
    departments: new Set(employees.map(e => e.department_id)).size,
  };

  if (loading) {
    return (
      <div className="employees-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading employees..." />
        </div>
      </div>
    );
  }

  if (selectedEmployee && viewMode === 'detail') {
    return (
      <EmployeeDetailView
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
        onEdit={() => {
          setShowForm(true);
          setViewMode('grid');
        }}
      />
    );
  }

  return (
    <div className="employees-page">
      <div className="container">
        <div className="employees-header">
          <div>
            <h1>Employee Master Data</h1>
            <p className="employees-subtitle">Comprehensive employee information management</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportToCSV(filteredEmployees, 'employees', [
              { key: 'name', label: 'Employee' },
              { key: 'job_title', label: 'Job Title' },
              { key: 'department_id', label: 'Department' },
              { key: 'work_email', label: 'Email' },
              { key: 'work_phone', label: 'Phone' },
              { key: 'attendance_state', label: 'Status' },
            ])}>
              Export
            </Button>
            <Button variant="secondary" icon={<Upload size={18} />}>
              Import
            </Button>
            <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>
              New Employee
            </Button>
          </div>
        </div>

        <div className="employees-stats">
          <Card className="stat-card">
            <Users size={24} />
            <div>
              <h3>{stats.total}</h3>
              <p>Total Employees</p>
            </div>
          </Card>
          <Card className="stat-card">
            <CheckCircle2 size={24} />
            <div>
              <h3>{stats.active}</h3>
              <p>Active</p>
            </div>
          </Card>
          <Card className="stat-card">
            <AlertCircle size={24} />
            <div>
              <h3>{stats.inactive}</h3>
              <p>Inactive</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Building2 size={24} />
            <div>
              <h3>{stats.departments}</h3>
              <p>Departments</p>
            </div>
          </Card>
        </div>

        <div className="employees-tabs">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({employees.length})
          </button>
          <button
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active ({stats.active})
          </button>
          <button
            className={`tab ${activeTab === 'inactive' ? 'active' : ''}`}
            onClick={() => setActiveTab('inactive')}
          >
            Inactive ({stats.inactive})
          </button>
          <button
            className={`tab ${activeTab === 'onboarding' ? 'active' : ''}`}
            onClick={() => setActiveTab('onboarding')}
          >
            Onboarding
          </button>
          <button
            className={`tab ${activeTab === 'offboarding' ? 'active' : ''}`}
            onClick={() => setActiveTab('offboarding')}
          >
            Offboarding
          </button>
        </div>

        <div className="employees-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="1">Engineering</option>
            <option value="2">HR</option>
            <option value="3">Sales</option>
            <option value="4">Finance</option>
          </select>
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="employees-grid">
            {filteredEmployees.map(employee => (
              <div
                key={employee.id}
                className="employee-card"
                onClick={() => {
                  setSelectedEmployee(employee);
                  setViewMode('detail');
                }}
              >
                <Card hover>
                <div className="employee-card-header">
                  <div className="employee-avatar">
                    {employee.name.charAt(0)}
                  </div>
                  <div className="employee-badges">
                    {employee.attendance_state === 'checked_in' && (
                      <span className="badge active">Active</span>
                    )}
                  </div>
                </div>
                <div className="employee-info">
                  <h3>{employee.name}</h3>
                  <p className="job-title">{employee.job_title || 'No Title'}</p>
                  <div className="employee-meta">
                    <div className="meta-item">
                      <Mail size={14} />
                      <span>{employee.work_email || 'No Email'}</span>
                    </div>
                    <div className="meta-item">
                      <Phone size={14} />
                      <span>{employee.work_phone || 'No Phone'}</span>
                    </div>
                  </div>
                </div>
                <div className="employee-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmployee(employee);
                      setShowForm(true);
                    }}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="delete"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirmAction({
                        title: 'Delete Employee',
                        message: 'Are you sure you want to delete this employee?',
                        confirmLabel: 'Delete',
                        variant: 'danger',
                      });
                      if (!ok) return;
                      // Handle delete
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(employee => (
                  <tr
                    key={employee.id}
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setViewMode('detail');
                    }}
                  >
                    <td>
                      <div className="table-employee">
                        <div className="table-avatar">{employee.name.charAt(0)}</div>
                        <span>{employee.name}</span>
                      </div>
                    </td>
                    <td>{employee.job_title || 'N/A'}</td>
                    <td>Department</td>
                    <td>{employee.work_email || 'N/A'}</td>
                    <td>{employee.work_phone || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${employee.attendance_state}`}>
                        {employee.attendance_state === 'checked_in' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(employee);
                            setShowForm(true);
                          }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="delete"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirmAction({
                              title: 'Delete Employee',
                              message: 'Are you sure you want to delete this employee?',
                              confirmLabel: 'Delete',
                              variant: 'danger',
                            });
                            if (!ok) return;
                            // Handle delete
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {showForm && (
          <EmployeeForm
            employee={selectedEmployee || undefined}
            onClose={() => {
              setShowForm(false);
              setSelectedEmployee(null);
            }}
            onSave={() => {
              loadData();
              setShowForm(false);
              setSelectedEmployee(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
