import { useState } from 'react';
import { BarChart3, TrendingUp, ShoppingCart, Eye } from 'lucide-react';
import './WebsiteAnalytics.css';

export const WebsiteAnalytics = () => {
  return (
    <div className="website-analytics">
      <div className="analytics-header">
        <BarChart3 size={24} />
        <h2>Website Analytics</h2>
      </div>

      <div className="analytics-stats">
        <div className="stat-card">
          <Eye size={24} />
          <div>
            <h3>Page Views</h3>
            <p className="stat-value">0</p>
          </div>
        </div>
        <div className="stat-card">
          <ShoppingCart size={24} />
          <div>
            <h3>Orders</h3>
            <p className="stat-value">0</p>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp size={24} />
          <div>
            <h3>Revenue</h3>
            <p className="stat-value">$0</p>
          </div>
        </div>
        <div className="stat-card">
          <BarChart3 size={24} />
          <div>
            <h3>Conversion Rate</h3>
            <p className="stat-value">0%</p>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        <div className="analytics-chart">
          <h3>Traffic Overview</h3>
          <p>Chart visualization would be implemented here</p>
        </div>
        <div className="analytics-chart">
          <h3>Sales Performance</h3>
          <p>Sales chart would be implemented here</p>
        </div>
      </div>
    </div>
  );
};

