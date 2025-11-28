import { useState, useEffect } from 'react';
import { Users, Trophy, TrendingUp, Award, BarChart3, Target } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { salesService, type SalesTeam, type SalesActivityKPI } from '../../services/salesService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './SalesTeamPerformance.css';

export const SalesTeamPerformance = () => {
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'performance' | 'incentives'>('teams');
  const [selectedTeam, setSelectedTeam] = useState<SalesTeam | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'teams') {
        const data = await salesService.team.getTeams({ is_active: true });
        setTeams(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sales-team-performance">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading team data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="sales-team-performance">
      <div className="container">
        <div className="team-header">
          <div>
            <h1>Sales Team Performance</h1>
            <p className="team-subtitle">Teams, performance metrics, and incentives</p>
          </div>
        </div>

        <div className="team-tabs">
          <button
            className={`tab ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <Users size={18} />
            Teams
          </button>
          <button
            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <BarChart3 size={18} />
            Performance
          </button>
          <button
            className={`tab ${activeTab === 'incentives' ? 'active' : ''}`}
            onClick={() => setActiveTab('incentives')}
          >
            <Award size={18} />
            Incentives
          </button>
        </div>

        {activeTab === 'teams' && (
          <div className="teams-grid">
            {teams.map((team) => (
              <div
                key={team.id}
                className="team-card"
                onClick={() => setSelectedTeam(team)}
              >
                <div className="team-header-card">
                  <div>
                    <h3>{team.name}</h3>
                    {team.code && <p className="team-code">{team.code}</p>}
                  </div>
                  <span className="team-badge active">Active</span>
                </div>
                {team.description && (
                  <p className="team-description">{team.description}</p>
                )}
                {team.team_members && team.team_members.length > 0 && (
                  <div className="team-members">
                    <span className="members-count">{team.team_members.length} member(s)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="performance-dashboard">
            <div className="performance-card">
              <Trophy size={24} />
              <h3>Performance Metrics</h3>
              <p>Activity KPIs and performance tracking will be displayed here</p>
            </div>
          </div>
        )}

        {activeTab === 'incentives' && (
          <div className="incentives-dashboard">
            <div className="incentives-card">
              <Award size={24} />
              <h3>Incentive Management</h3>
              <p>Incentive calculation and payment tracking will be displayed here</p>
            </div>
          </div>
        )}

        {selectedTeam && (
          <div className="modal-overlay" onClick={() => setSelectedTeam(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedTeam.name}</h2>
                <button onClick={() => setSelectedTeam(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="team-details">
                  {selectedTeam.description && (
                    <div className="detail-section">
                      <h3>Description</h3>
                      <p>{selectedTeam.description}</p>
                    </div>
                  )}
                  {selectedTeam.team_members && selectedTeam.team_members.length > 0 && (
                    <div className="detail-section">
                      <h3>Team Members</h3>
                      <div className="members-list">
                        {selectedTeam.team_members.map((member) => (
                          <div key={member.id} className="member-item">
                            <span className="member-role">{member.role}</span>
                            <span className="member-id">User ID: {member.user_id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

