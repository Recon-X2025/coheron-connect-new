import { useState, useEffect } from 'react';
import { PlayCircle, Clock, Users, BookOpen, Plus, Search, Filter, Award, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { apiService } from '../../services/apiService';
import { CourseForm } from './components/CourseForm';
import './LMS.css';

type LMSTab = 'courses' | 'enrollments' | 'calendar' | 'skills' | 'certifications';

export const LMS = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LMSTab>('courses');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await apiService.get<any>('/courses');
      setCourses(data);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'courses' as LMSTab, label: 'Courses', icon: <BookOpen size={18} /> },
    { id: 'enrollments' as LMSTab, label: 'Enrollments', icon: <Users size={18} /> },
    { id: 'calendar' as LMSTab, label: 'Training Calendar', icon: <Calendar size={18} /> },
    { id: 'skills' as LMSTab, label: 'Skills Matrix', icon: <TrendingUp size={18} /> },
    { id: 'certifications' as LMSTab, label: 'Certifications', icon: <Award size={18} /> },
  ];

  const stats = {
    totalCourses: courses.length,
    activeEnrollments: 234,
    completed: 156,
    certifications: 89,
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="lms-page">
      <div className="container">
        <div className="lms-header">
          <div>
            <h1>Learning & Development</h1>
            <p className="lms-subtitle">Training programs, courses, and employee development</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" icon={<Filter size={18} />}>
              Filter
            </Button>
            <Button icon={<Plus size={18} />} onClick={() => setShowCourseForm(true)}>
              New Course
            </Button>
          </div>
        </div>

        <div className="lms-stats">
          <Card className="stat-card">
            <BookOpen size={24} className="stat-icon" />
            <div>
              <h3>{stats.totalCourses}</h3>
              <p>Total Courses</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Users size={24} className="stat-icon" />
            <div>
              <h3>{stats.activeEnrollments}</h3>
              <p>Active Enrollments</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Award size={24} className="stat-icon" />
            <div>
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Award size={24} className="stat-icon" />
            <div>
              <h3>{stats.certifications}</h3>
              <p>Certifications</p>
            </div>
          </Card>
        </div>

        <div className="lms-tabs">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id || (tab as any)._id || idx}
              className={`lms-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="lms-content">
          {activeTab === 'courses' && (
            <>
              <div className="search-toolbar">
                <div className="search-box">
                  <Search size={20} />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="courses-grid">
                {filteredCourses.map((course, idx) => (
                  <Card key={course.id || (course as any)._id || idx} hover className="course-card">
                    <div className="course-image">
                      <PlayCircle size={48} className="play-icon" />
                    </div>
                    <div className="course-content">
                      <h3>{course.name}</h3>
                      <p className="course-description">{course.description}</p>
                      <div className="course-meta">
                        <div className="meta-item">
                          <Clock size={16} />
                          <span>{course.total_time}h</span>
                        </div>
                        <div className="meta-item">
                          <Users size={16} />
                          <span>{course.members_count} enrolled</span>
                        </div>
                        <div className="meta-item">
                          <BookOpen size={16} />
                          <span>12 lessons</span>
                        </div>
                      </div>
                      <div className="course-actions">
                        <Button variant="secondary" size="sm">Enroll</Button>
                        <Button variant="secondary" size="sm">View Details</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
          {activeTab === 'enrollments' && <EnrollmentsTab />}
          {activeTab === 'calendar' && <CalendarTab />}
          {activeTab === 'skills' && <SkillsTab />}
          {activeTab === 'certifications' && <CertificationsTab />}
        </div>

        {showCourseForm && (
          <CourseForm
            onClose={() => setShowCourseForm(false)}
            onSave={() => {
              setShowCourseForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

const EnrollmentsTab = () => {
  const enrollments = [
    { id: 1, employee: 'Rajesh Kumar', course: 'React Advanced', status: 'in_progress', progress: 65 },
    { id: 2, employee: 'Priya Sharma', course: 'Leadership Skills', status: 'completed', progress: 100 },
  ];

  return (
    <Card>
      <h3>Course Enrollments</h3>
      <table className="enrollments-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Course</th>
            <th>Progress</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment, idx) => (
            <tr key={enrollment.id || (enrollment as any)._id || idx}>
              <td>{enrollment.employee}</td>
              <td>{enrollment.course}</td>
              <td>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${enrollment.progress}%` }}></div>
                  </div>
                  <span>{enrollment.progress}%</span>
                </div>
              </td>
              <td>
                <span className={`status-badge ${enrollment.status}`}>
                  {enrollment.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </td>
              <td>
                <Button variant="secondary" size="sm">View</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

const CalendarTab = () => {
  return (
    <Card>
      <h3>Training Calendar</h3>
      <div className="calendar-placeholder">
        <Calendar size={48} />
        <p>Training calendar view</p>
      </div>
    </Card>
  );
};

const SkillsTab = () => {
  const skills = [
    { skill: 'JavaScript', employees: 45, proficiency: 'Advanced' },
    { skill: 'React', employees: 32, proficiency: 'Intermediate' },
    { skill: 'Node.js', employees: 28, proficiency: 'Intermediate' },
    { skill: 'Python', employees: 15, proficiency: 'Beginner' },
  ];

  return (
    <Card>
      <h3>Skills Matrix</h3>
      <table className="skills-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Employees</th>
            <th>Average Proficiency</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill, index) => (
            <tr key={index}>
              <td>{skill.skill}</td>
              <td>{skill.employees}</td>
              <td>
                <span className={`proficiency-badge ${skill.proficiency.toLowerCase()}`}>
                  {skill.proficiency}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

const CertificationsTab = () => {
  const certifications = [
    { id: 1, employee: 'Rajesh Kumar', course: 'React Advanced', date: '2024-11-15', certificate: 'CERT-001' },
    { id: 2, employee: 'Priya Sharma', course: 'Leadership Skills', date: '2024-10-20', certificate: 'CERT-002' },
  ];

  return (
    <Card>
      <h3>Certifications</h3>
      <div className="certifications-list">
        {certifications.map((cert, idx) => (
          <div key={cert.id || (cert as any)._id || idx} className="certification-item">
            <Award size={24} />
            <div className="cert-info">
              <h4>{cert.employee}</h4>
              <p>{cert.course} • {cert.certificate}</p>
              <p className="cert-date">Issued: {new Date(cert.date).toLocaleDateString()}</p>
            </div>
            <Button variant="secondary" size="sm">Download</Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
