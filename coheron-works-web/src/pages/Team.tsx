import { Plus, Mail, MoreVertical, Crown, Shield, User } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import './Team.css';

export const Team = () => {
    const teamMembers = [
        {
            name: 'Sarah Chen',
            email: 'sarah.chen@coheronworks.com',
            role: 'Admin',
            status: 'active',
            avatar: 'SC',
            projects: 12
        },
        {
            name: 'Mike Johnson',
            email: 'mike.j@coheronworks.com',
            role: 'Developer',
            status: 'active',
            avatar: 'MJ',
            projects: 8
        },
        {
            name: 'Emma Davis',
            email: 'emma.d@coheronworks.com',
            role: 'Designer',
            status: 'active',
            avatar: 'ED',
            projects: 15
        },
        {
            name: 'Alex Kumar',
            email: 'alex.k@coheronworks.com',
            role: 'Developer',
            status: 'active',
            avatar: 'AK',
            projects: 10
        },
        {
            name: 'Lisa Wang',
            email: 'lisa.w@coheronworks.com',
            role: 'Member',
            status: 'inactive',
            avatar: 'LW',
            projects: 3
        },
    ];

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Admin':
                return <Crown size={16} />;
            case 'Developer':
            case 'Designer':
                return <Shield size={16} />;
            default:
                return <User size={16} />;
        }
    };

    const getRoleClass = (role: string) => {
        return `role-badge role-${role.toLowerCase()}`;
    };

    return (
        <div className="team-page">
            <div className="container">
                <div className="team-header">
                    <div>
                        <h1>Team</h1>
                        <p className="team-subtitle">Manage your team members and their roles</p>
                    </div>
                    <Button icon={<Plus size={20} />}>Invite Member</Button>
                </div>

                <div className="team-grid">
                    {teamMembers.map((member, index) => (
                        <Card key={index} hover className="team-card">
                            <div className="team-card-header">
                                <div className="member-avatar-large">{member.avatar}</div>
                                <button className="team-menu">
                                    <MoreVertical size={20} />
                                </button>
                            </div>

                            <div className="member-info">
                                <h3>{member.name}</h3>
                                <div className="member-email">
                                    <Mail size={14} />
                                    {member.email}
                                </div>
                            </div>

                            <div className="member-meta">
                                <div className={getRoleClass(member.role)}>
                                    {getRoleIcon(member.role)}
                                    <span>{member.role}</span>
                                </div>
                                <div className={`status-indicator status-${member.status}`}>
                                    {member.status}
                                </div>
                            </div>

                            <div className="member-stats">
                                <div className="stat-item">
                                    <span className="stat-value">{member.projects}</span>
                                    <span className="stat-label">Projects</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};
