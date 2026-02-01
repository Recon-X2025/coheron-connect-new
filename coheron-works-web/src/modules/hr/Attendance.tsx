import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle2, XCircle, AlertCircle, Download, Upload, Settings, Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ShiftForm } from './components/ShiftForm';
import './Attendance.css';

type AttendanceTab = 'overview' | 'timesheet' | 'shifts' | 'overtime' | 'biometric';

export const Attendance = () => {
  const [activeTab, setActiveTab] = useState<AttendanceTab>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const tabs = [
    { id: 'overview' as AttendanceTab, label: 'Overview', icon: <Calendar size={18} /> },
    { id: 'timesheet' as AttendanceTab, label: 'Timesheet', icon: <Clock size={18} /> },
    { id: 'shifts' as AttendanceTab, label: 'Shifts & Rosters', icon: <Calendar size={18} /> },
    { id: 'overtime' as AttendanceTab, label: 'Overtime', icon: <AlertCircle size={18} /> },
    { id: 'biometric' as AttendanceTab, label: 'Biometric', icon: <Settings size={18} /> },
  ];

  const attendanceStats = {
    present: 1234,
    absent: 12,
    late: 45,
    onLeave: 23,
    overtime: 89,
  };

  return (
    <div className="attendance-page">
      <div className="container">
        <div className="attendance-header">
          <div>
            <h1>Attendance & Time Management</h1>
            <p className="attendance-subtitle">Track employee attendance and working hours</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" icon={<Download size={18} />}>
              Export
            </Button>
            <Button variant="secondary" icon={<Upload size={18} />}>
              Sync Biometric
            </Button>
            <Button icon={<Settings size={18} />}>
              Settings
            </Button>
          </div>
        </div>

        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartChange={(d) => { setStartDate(d); if (d && !endDate) setSelectedDate(d); }}
          onEndChange={setEndDate}
          onClear={() => { setStartDate(''); setEndDate(''); }}
        />

        <div className="attendance-stats">
          <Card className="stat-card">
            <CheckCircle2 size={24} className="stat-icon present" />
            <div>
              <h3>{attendanceStats.present}</h3>
              <p>Present Today</p>
            </div>
          </Card>
          <Card className="stat-card">
            <XCircle size={24} className="stat-icon absent" />
            <div>
              <h3>{attendanceStats.absent}</h3>
              <p>Absent</p>
            </div>
          </Card>
          <Card className="stat-card">
            <AlertCircle size={24} className="stat-icon late" />
            <div>
              <h3>{attendanceStats.late}</h3>
              <p>Late Arrivals</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Clock size={24} className="stat-icon overtime" />
            <div>
              <h3>{attendanceStats.overtime}</h3>
              <p>Overtime Hours</p>
            </div>
          </Card>
        </div>

        <div className="attendance-tabs">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id || (tab as any)._id || idx}
              className={`attendance-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="attendance-content">
          {activeTab === 'overview' && <OverviewTab selectedDate={selectedDate} setSelectedDate={setSelectedDate} startDate={startDate} endDate={endDate} />}
          {activeTab === 'timesheet' && <TimesheetTab />}
          {activeTab === 'shifts' && <ShiftsTab onAddShift={() => setShowShiftForm(true)} />}
          {activeTab === 'overtime' && <OvertimeTab />}
          {activeTab === 'biometric' && <BiometricTab />}
        </div>

        {showShiftForm && (
          <ShiftForm
            onClose={() => setShowShiftForm(false)}
            onSave={() => {
              setShowShiftForm(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

const OverviewTab = ({ selectedDate, setSelectedDate, startDate, endDate }: { selectedDate: string; setSelectedDate: (date: string) => void; startDate: string; endDate: string }) => {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<any>('/attendance', { date: selectedDate });
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = attendanceData.filter((emp: any) => {
    const empDate = (emp.date || selectedDate || '').split('T')[0].split(' ')[0];
    const matchesStart = !startDate || empDate >= startDate;
    const matchesEnd = !endDate || empDate <= endDate;
    return matchesStart && matchesEnd;
  });

  if (loading) {
    return <div className="p-8">Loading attendance data...</div>;
  }

  return (
    <div className="overview-content">
      <Card>
        <div className="date-selector">
          <label>Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h3>Today's Attendance</h3>
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours Worked</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((emp, idx) => (
              <tr key={emp.id || (emp as any)._id || idx}>
                <td>{emp.employee_name || emp.name}</td>
                <td>{emp.emp_id || emp.empId}</td>
                <td>
                  <span className={emp.late_entry ? 'late' : ''}>{emp.check_in || '-'}</span>
                </td>
                <td>{emp.check_out || '-'}</td>
                <td>{emp.hours_worked ? `${emp.hours_worked}h` : '-'}</td>
                <td>
                  <span className={`status-badge ${emp.status}`}>
                    {emp.status === 'present' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const TimesheetTab = () => {
  return (
    <Card>
      <h3>Timesheet Management</h3>
      <p>Project-wise and department-wise time tracking</p>
      <div className="timesheet-grid">
        <div className="timesheet-card">
          <h4>Project: Mobile App</h4>
          <p>Total Hours: 40h</p>
          <Button variant="secondary" size="sm" onClick={() => showToast('Timesheet loaded', 'success')}>View Details</Button>
        </div>
        <div className="timesheet-card">
          <h4>Project: Website Redesign</h4>
          <p>Total Hours: 32h</p>
          <Button variant="secondary" size="sm" onClick={() => showToast('Timesheet loaded', 'success')}>View Details</Button>
        </div>
      </div>
    </Card>
  );
};

const ShiftsTab = ({ onAddShift }: { onAddShift: () => void }) => {
  return (
    <Card>
      <h3>Shifts & Rosters</h3>
      <div className="shifts-list">
        <div className="shift-item">
          <h4>Morning Shift</h4>
          <p>09:00 - 18:00</p>
          <span className="shift-count">1,200 employees</span>
        </div>
        <div className="shift-item">
          <h4>Evening Shift</h4>
          <p>14:00 - 23:00</p>
          <span className="shift-count">34 employees</span>
        </div>
      </div>
      <Button icon={<Plus size={18} />} onClick={onAddShift}>Create Shift</Button>
    </Card>
  );
};

const OvertimeTab = () => {
  return (
    <Card>
      <h3>Overtime Management</h3>
      <div className="overtime-rules">
        <div className="rule-item">
          <h4>Standard Overtime</h4>
          <p>1.5x rate after 8 hours</p>
        </div>
        <div className="rule-item">
          <h4>Weekend Overtime</h4>
          <p>2x rate on weekends</p>
        </div>
      </div>
      <table className="overtime-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Overtime Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rajesh Kumar</td>
            <td>2024-12-01</td>
            <td>2.5 hours</td>
            <td><span className="status-badge pending">Pending Approval</span></td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
};

const BiometricTab = () => {
  return (
    <Card>
      <h3>Biometric Integration</h3>
      <div className="biometric-status">
        <div className="status-item">
          <CheckCircle2 size={20} className="success" />
          <span>Connected to biometric device</span>
        </div>
        <div className="status-item">
          <span>Last sync: 2 minutes ago</span>
        </div>
      </div>
      <Button>Sync Now</Button>
    </Card>
  );
};

