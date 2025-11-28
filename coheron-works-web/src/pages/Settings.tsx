import { useState, useEffect } from 'react';
import { User, Bell, Lock, Palette, Globe, Save, Check } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { showToast } from '../components/Toast';
import './Settings.css';

type Tab = 'profile' | 'notifications' | 'security' | 'appearance' | 'integrations';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    darkMode: false,
    weeklyReports: false,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // In a real implementation, fetch user data from API
      // For now, use stored data or defaults
      const storedName = localStorage.getItem('userName') || 'Sarah Chen';
      const storedEmail = localStorage.getItem('userEmail') || 'sarah.chen@coheronworks.com';
      setProfileData({
        name: storedName,
        email: storedEmail,
        bio: 'Product designer passionate about creating beautiful user experiences.',
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setSaved(false);
    try {
      // In a real implementation, update via API
      localStorage.setItem('userName', profileData.name);
      localStorage.setItem('userEmail', profileData.email);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    // Auto-save preferences
    localStorage.setItem('preferences', JSON.stringify(preferences));
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // In a real implementation, call API to delete account
      showToast('Account deletion will be processed here', 'info');
    }
  };

  return (
    <div className="settings-page">
      <div className="container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p className="settings-subtitle">Manage your account and preferences</p>
        </div>

        <div className="settings-layout">
          <div className="settings-sidebar">
            <button
              className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={20} />
              Profile
            </button>
            <button
              className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={20} />
              Notifications
            </button>
            <button
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Lock size={20} />
              Security
            </button>
            <button
              className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette size={20} />
              Appearance
            </button>
            <button
              className={`settings-tab ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              <Globe size={20} />
              Integrations
            </button>
          </div>

          <div className="settings-content">
            {activeTab === 'profile' && (
              <Card className="settings-section">
                <h2 className="section-title">Profile Information</h2>
                <p className="section-description">Update your personal information and email address</p>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about yourself..."
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  />
                </div>

                <div className="form-actions">
                  <Button variant="ghost">Cancel</Button>
                  <Button
                    icon={saved ? <Check size={20} /> : <Save size={20} />}
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Saving...
                      </>
                    ) : saved ? (
                      'Saved!'
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="settings-section">
                <h2 className="section-title">Preferences</h2>
                <p className="section-description">Customize your experience</p>

                <div className="preference-item">
                  <div className="preference-info">
                    <h3>Email Notifications</h3>
                    <p>Receive email updates about your projects</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={() => handlePreferenceChange('emailNotifications')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h3>Dark Mode</h3>
                    <p>Use dark theme across the application</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={preferences.darkMode}
                      onChange={() => handlePreferenceChange('darkMode')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h3>Weekly Reports</h3>
                    <p>Get weekly summary of your activity</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={preferences.weeklyReports}
                      onChange={() => handlePreferenceChange('weeklyReports')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="settings-section">
                <h2 className="section-title">Security Settings</h2>
                <p className="section-description">Manage your password and security preferences</p>

                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" placeholder="Enter current password" />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" placeholder="Enter new password" />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" placeholder="Confirm new password" />
                </div>

                <div className="form-actions">
                  <Button>Update Password</Button>
                </div>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card className="settings-section">
                <h2 className="section-title">Appearance</h2>
                <p className="section-description">Customize the look and feel of the application</p>

                <div className="preference-item">
                  <div className="preference-info">
                    <h3>Theme</h3>
                    <p>Choose your preferred color theme</p>
                  </div>
                  <select className="theme-select">
                    <option>Light</option>
                    <option>Dark</option>
                    <option>Auto</option>
                  </select>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h3>Language</h3>
                    <p>Select your preferred language</p>
                  </div>
                  <select className="theme-select">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </Card>
            )}

            {activeTab === 'integrations' && (
              <Card className="settings-section">
                <h2 className="section-title">Integrations</h2>
                <p className="section-description">Connect third-party services</p>

                <div className="integration-list">
                  <div className="integration-item">
                    <div className="integration-info">
                      <h3>Gmail</h3>
                      <p>Connect your Gmail account to sync emails</p>
                    </div>
                    <Button variant="ghost">Connect</Button>
                  </div>
                  <div className="integration-item">
                    <div className="integration-info">
                      <h3>Google Calendar</h3>
                      <p>Sync your calendar events</p>
                    </div>
                    <Button variant="ghost">Connect</Button>
                  </div>
                  <div className="integration-item">
                    <div className="integration-info">
                      <h3>Slack</h3>
                      <p>Get notifications in Slack</p>
                    </div>
                    <Button variant="ghost">Connect</Button>
                  </div>
                  <div className="integration-item">
                    <div className="integration-info">
                      <h3>Adobe DocuSign</h3>
                      <p>Electronic signature and document management</p>
                    </div>
                    <Button variant="ghost">Connect</Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="settings-section danger-zone">
              <h2 className="section-title">Danger Zone</h2>
              <p className="section-description">Irreversible actions</p>

              <div className="danger-actions">
                <div>
                  <h3>Delete Account</h3>
                  <p>Permanently delete your account and all data</p>
                </div>
                <Button variant="ghost" className="danger-btn" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
