import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Calendar,
  Wallet,
  UserPlus,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import LightKpiCard from '../../components/LightKpiCard';
import { Card } from '../../components/Card';
import { showToast } from '../../components/Toast';
import './HRDashboard.css';

interface HRDashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaveRequests: number;
  pendingPayroll: number;
  activeRecruitment: number;
  upcomingAppraisals: number;
  attendanceToday: number;
  onLeaveToday: number;
}

export const HRDashboard = () => {
  const [stats, setStats] = useState<HRDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [employees, leaveRequests, payslips, applicants, appraisals, attendance] =
        await Promise.all([
          apiService.get<any>('/employees').catch((err) => { console.error('Failed to load employees:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/leave/requests', { status: 'pending' }).catch((err) => { console.error('Failed to load leave requests:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/payroll/payslips', { status: 'draft' }).catch((err) => { console.error('Failed to load payslips:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/applicants', { status: 'active' }).catch((err) => { console.error('Failed to load applicants:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/appraisals', { status: 'scheduled' }).catch((err) => { console.error('Failed to load appraisals:', err.userMessage || err.message); return []; }),
          apiService.get<any>('/attendance', { date: new Date().toISOString().split('T')[0] }).catch((err) => { console.error('Failed to load attendance:', err.userMessage || err.message); return []; }),
        ]);

      const activeEmployees = employees.filter((e: any) => e.status === 'active' || e.employment_status === 'active').length;
      const onLeaveToday = leaveRequests.filter((lr: any) => {
        const today = new Date().toISOString().split('T')[0];
        return lr.status === 'approved' && lr.start_date <= today && lr.end_date >= today;
      }).length;

      setStats({
        totalEmployees: employees.length,
        activeEmployees,
        pendingLeaveRequests: leaveRequests.length,
        pendingPayroll: payslips.length,
        activeRecruitment: applicants.length,
        upcomingAppraisals: appraisals.length,
        attendanceToday: attendance.length,
        onLeaveToday,
      });
    } catch (error: any) {
      console.error('Failed to load HR dashboard data:', error);
      showToast(error.userMessage || 'Failed to load HR data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="hr-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading HR dashboard..." />
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Employees',
      value: stats?.totalEmployees || 0,
      delta: undefined,
      icon: <Users size={24} />,
    },
    {
      title: 'Active Employees',
      value: stats?.activeEmployees || 0,
      delta: stats && stats.totalEmployees > 0 
        ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) 
        : undefined,
      icon: <UserCheck size={24} />,
    },
    {
      title: 'Pending Leave Requests',
      value: stats?.pendingLeaveRequests || 0,
      delta: undefined,
      icon: <Calendar size={24} />,
    },
    {
      title: 'Pending Payroll',
      value: stats?.pendingPayroll || 0,
      delta: undefined,
      icon: <Wallet size={24} />,
    },
    {
      title: 'Active Recruitment',
      value: stats?.activeRecruitment || 0,
      delta: undefined,
      icon: <UserPlus size={24} />,
    },
    {
      title: 'Upcoming Appraisals',
      value: stats?.upcomingAppraisals || 0,
      delta: undefined,
      icon: <TrendingUp size={24} />,
    },
    {
      title: 'Attendance Today',
      value: stats?.attendanceToday || 0,
      delta: stats && stats.activeEmployees > 0
        ? Math.round((stats.attendanceToday / stats.activeEmployees) * 100)
        : undefined,
      icon: <Clock size={24} />,
    },
    {
      title: 'On Leave Today',
      value: stats?.onLeaveToday || 0,
      delta: undefined,
      icon: <AlertCircle size={24} />,
    },
  ];

  return (
    <div className="hr-dashboard">
      <div className="container">
        <div className="hr-dashboard-header">
          <div>
            <h1>HR Dashboard</h1>
            <p className="hr-dashboard-subtitle">Overview of your workforce and HR operations</p>
          </div>
          <Link to="/hr/modules" className="btn-outline">
            View All Modules
          </Link>
        </div>

        <div className="hr-dashboard-kpis">
          {kpiCards.map((kpi, index) => (
            <LightKpiCard
              key={index}
              title={kpi.title}
              value={kpi.value}
              delta={kpi.delta}
              icon={kpi.icon}
            />
          ))}
        </div>

        <div className="hr-dashboard-sections">
          <Card className="hr-dashboard-section-card">
            <h3>Quick Actions</h3>
            <div className="hr-quick-actions">
              <Link to="/hr/employees" className="hr-quick-action">
                <Users size={20} />
                <span>Manage Employees</span>
              </Link>
              <Link to="/hr/payroll" className="hr-quick-action">
                <Wallet size={20} />
                <span>Process Payroll</span>
              </Link>
              <Link to="/hr/leave" className="hr-quick-action">
                <Calendar size={20} />
                <span>Leave Management</span>
              </Link>
              <Link to="/hr/recruitment" className="hr-quick-action">
                <UserPlus size={20} />
                <span>Recruitment</span>
              </Link>
            </div>
          </Card>

          <Card className="hr-dashboard-section-card">
            <h3>Recent Activity</h3>
            <div className="hr-recent-activity">
              <p className="hr-activity-placeholder">No recent activity to display</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

