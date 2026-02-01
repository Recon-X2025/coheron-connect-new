import { Link } from 'react-router-dom';
import { Users, Wallet, BookOpen, UserPlus, FileText, TrendingUp, Clock, Calendar, UserMinus } from 'lucide-react';
import { Card } from '../../components/Card';
import './HR.css';

interface HRModule {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export const HRModules = () => {
  const hrModules: HRModule[] = [
    {
      id: 'employees',
      name: 'Employees',
      description: 'Manage employee profiles, information, and records',
      icon: <Users size={32} />,
      path: '/hr/employees',
      color: '#3b82f6',
    },
    {
      id: 'payroll',
      name: 'Payroll',
      description: 'Process salaries, manage payroll, and generate payslips',
      icon: <Wallet size={32} />,
      path: '/hr/payroll',
      color: '#10b981',
    },
    {
      id: 'lms',
      name: 'Learning Management',
      description: 'Training programs, courses, and employee development',
      icon: <BookOpen size={32} />,
      path: '/hr/lms',
      color: '#8b5cf6',
    },
    {
      id: 'recruitment',
      name: 'Recruitment',
      description: 'Job postings, applications, and hiring pipeline',
      icon: <UserPlus size={32} />,
      path: '/hr/recruitment',
      color: '#f59e0b',
    },
    {
      id: 'policies',
      name: 'Policies',
      description: 'Company policies, documents, and compliance',
      icon: <FileText size={32} />,
      path: '/hr/policies',
      color: '#ef4444',
    },
    {
      id: 'appraisals',
      name: 'Appraisals',
      description: 'Performance reviews, evaluations, and feedback',
      icon: <TrendingUp size={32} />,
      path: '/hr/appraisals',
      color: '#06b6d4',
    },
    {
      id: 'attendance',
      name: 'Attendance',
      description: 'Time tracking, biometric integration, and timesheets',
      icon: <Clock size={32} />,
      path: '/hr/attendance',
      color: '#f59e0b',
    },
    {
      id: 'leave',
      name: 'Leave Management',
      description: 'Leave requests, policies, and calendar',
      icon: <Calendar size={32} />,
      path: '/hr/leave',
      color: '#8b5cf6',
    },
    {
      id: 'onboarding',
      name: 'Onboarding',
      description: 'New employee onboarding and orientation',
      icon: <UserPlus size={32} />,
      path: '/hr/onboarding',
      color: '#10b981',
    },
    {
      id: 'offboarding',
      name: 'Offboarding',
      description: 'Employee exit process and final settlement',
      icon: <UserMinus size={32} />,
      path: '/hr/offboarding',
      color: '#ef4444',
    },
  ];

  // Sort modules to show most important first
  const sortedModules = hrModules.sort((a, b) => {
    const order = ['employees', 'payroll', 'attendance', 'leave', 'recruitment', 'appraisals', 'lms', 'onboarding', 'offboarding', 'policies'];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  return (
    <div className="hr-page">
      <div className="container">
        <div className="hr-header">
          <h1>Human Resources</h1>
          <p className="hr-subtitle">Manage your workforce and HR operations</p>
        </div>

        <div className="hr-modules-grid">
          {sortedModules.map((module, idx) => (
            <Link key={module.id || (module as any)._id || idx} to={module.path} className="hr-module-link">
              <Card hover className="hr-module-card">
                <div className="hr-module-icon" style={{ backgroundColor: `${module.color}20`, color: module.color }}>
                  {module.icon}
                </div>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

