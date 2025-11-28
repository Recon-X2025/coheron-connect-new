// Gmail Integration (Sprint 8)
import React, { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import './GmailIntegration.css';

interface GmailIntegrationProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const GmailIntegration: React.FC<GmailIntegrationProps> = ({
  onConnect,
  onDisconnect,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // OAuth2 flow would go here
      // For now, simulate connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsConnected(true);
      if (onConnect) onConnect();
    } catch (error) {
      console.error('Failed to connect Gmail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    if (onDisconnect) onDisconnect();
  };

  return (
    <div className="gmail-integration">
      <div className="integration-header">
        <Mail size={24} />
        <div>
          <h3>Gmail Integration</h3>
          <p>Connect your Gmail account to sync emails</p>
        </div>
      </div>

      {isConnected ? (
        <div className="integration-status connected">
          <CheckCircle size={20} />
          <span>Connected</span>
          <button onClick={handleDisconnect} className="disconnect-btn">
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className="connect-btn"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect Gmail'}
        </button>
      )}
    </div>
  );
};

export default GmailIntegration;

