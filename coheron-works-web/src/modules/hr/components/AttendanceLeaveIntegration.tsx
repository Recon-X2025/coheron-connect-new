import { useState } from 'react';
import { Calendar, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import './AttendanceLeaveIntegration.css';

export const AttendanceLeaveIntegration = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('2024-12');

  const attendanceData = [
    {
      employeeId: 'EMP001',
      name: 'Rajesh Kumar',
      present: 22,
      absent: 0,
      leave: 0,
      overtime: 8,
      late: 2,
    },
    {
      employeeId: 'EMP002',
      name: 'Priya Sharma',
      present: 20,
      absent: 0,
      leave: 2,
      overtime: 0,
      late: 0,
    },
  ];

  return (
    <div className="attendance-leave-integration">
      <div className="integration-header">
        <Card>
          <div className="header-content">
            <div>
              <h3>Attendance & Leave Integration</h3>
              <p>Sync attendance and leave data for payroll processing</p>
            </div>
            <div className="period-select">
              <label>Payroll Period</label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="sync-section">
        <Card>
          <h4>Data Synchronization</h4>
          <div className="sync-actions">
            <Button icon={<Calendar size={18} />}>Sync Attendance</Button>
            <Button icon={<Clock size={18} />}>Sync Leave Data</Button>
            <Button icon={<UserCheck size={18} />}>Validate All Data</Button>
          </div>
          <div className="sync-status">
            <div className="status-item">
              <UserCheck size={20} className="success" />
              <span>Attendance data synced: 1,234 employees</span>
            </div>
            <div className="status-item">
              <AlertCircle size={20} className="warning" />
              <span>12 employees with missing attendance</span>
            </div>
            <div className="status-item">
              <UserCheck size={20} className="success" />
              <span>Leave data synced: 1,234 employees</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="attendance-table-section">
        <Card>
          <h4>Attendance Summary</h4>
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Present Days</th>
                <th>Absent Days</th>
                <th>Leave Days</th>
                <th>Overtime (hrs)</th>
                <th>Late Entries</th>
                <th>LOP Days</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((emp) => (
                <tr key={emp.employeeId}>
                  <td>
                    <div className="employee-cell">
                      <span className="emp-id">{emp.employeeId}</span>
                      <span className="emp-name">{emp.name}</span>
                    </div>
                  </td>
                  <td>{emp.present}</td>
                  <td>{emp.absent}</td>
                  <td>{emp.leave}</td>
                  <td>{emp.overtime}</td>
                  <td>{emp.late}</td>
                  <td>{emp.absent > 0 ? emp.absent : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="leave-types-section">
        <Card>
          <h4>Leave Types & Policies</h4>
          <div className="leave-types">
            <div className="leave-type-item">
              <span className="leave-name">Paid Leave (PL)</span>
              <span className="leave-balance">12 days available</span>
            </div>
            <div className="leave-type-item">
              <span className="leave-name">Sick Leave (SL)</span>
              <span className="leave-balance">6 days available</span>
            </div>
            <div className="leave-type-item">
              <span className="leave-name">Casual Leave (CL)</span>
              <span className="leave-balance">8 days available</span>
            </div>
            <div className="leave-type-item">
              <span className="leave-name">Loss of Pay (LOP)</span>
              <span className="leave-balance">Deducted from salary</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

