import { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { salesService, type SalesForecast, type SalesTarget } from '../../services/salesService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { ForecastForm } from './components/ForecastForm';
import './SalesForecasting.css';

export const SalesForecasting = () => {
  const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forecasts' | 'targets'>('forecasts');
  const [selectedForecast, setSelectedForecast] = useState<SalesForecast | null>(null);
  const [showForecastForm, setShowForecastForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'forecasts') {
        const data = await salesService.forecasting.getForecasts({});
        setForecasts(data);
      } else {
        const data = await salesService.forecasting.getTargets({});
        setTargets(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAchievementPercentage = (target: SalesTarget) => {
    if (target.revenue_target === 0) return 0;
    return ((target.achievement_revenue / target.revenue_target) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="sales-forecasting">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading forecasting data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="sales-forecasting">
      <div className="container">
        <div className="forecasting-header">
          <div>
            <h1>Sales Forecasting & Planning</h1>
            <p className="forecasting-subtitle">Forecasts, targets, and achievement tracking</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowForecastForm(true)}>
            New {activeTab === 'forecasts' ? 'Forecast' : 'Target'}
          </Button>
        </div>

        <div className="forecasting-tabs">
          <button
            className={`tab ${activeTab === 'forecasts' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecasts')}
          >
            <TrendingUp size={18} />
            Forecasts
          </button>
          <button
            className={`tab ${activeTab === 'targets' ? 'active' : ''}`}
            onClick={() => setActiveTab('targets')}
          >
            <Target size={18} />
            Targets
          </button>
        </div>

        {activeTab === 'forecasts' && (
          <div className="forecasts-grid">
            {forecasts.map((forecast) => (
              <div
                key={forecast.id}
                className="forecast-card"
                onClick={() => setSelectedForecast(forecast)}
              >
                <div className="forecast-header">
                  <h3>{forecast.forecast_name}</h3>
                  <span className="forecast-type">{forecast.forecast_type}</span>
                </div>
                <div className="forecast-body">
                  <div className="forecast-metric">
                    <span className="metric-label">Forecasted</span>
                    <span className="metric-value">
                      {formatInLakhsCompact(forecast.forecasted_amount)}
                    </span>
                  </div>
                  <div className="forecast-metric">
                    <span className="metric-label">Actual</span>
                    <span className="metric-value actual">
                      {formatInLakhsCompact(forecast.actual_amount)}
                    </span>
                  </div>
                  <div className="forecast-period">
                    <Calendar size={14} />
                    <span>
                      {new Date(forecast.period_start).toLocaleDateString()} -{' '}
                      {new Date(forecast.period_end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {forecast.confidence_level && (
                  <div className="forecast-footer">
                    <span>Confidence: {forecast.confidence_level}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'targets' && (
          <div className="targets-list">
            {targets.map((target) => {
              const achievement = parseFloat(calculateAchievementPercentage(target) || '0');
              return (
                <div key={target.id} className="target-card">
                  <div className="target-header">
                    <div>
                      <h3>{target.target_name}</h3>
                      <p className="target-period">
                        {new Date(target.period_start).toLocaleDateString()} -{' '}
                        {new Date(target.period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="achievement-badge">
                      <span className="achievement-percentage">{achievement}%</span>
                    </div>
                  </div>
                  <div className="target-body">
                    <div className="target-metric">
                      <span className="metric-label">Target</span>
                      <span className="metric-value">
                        {formatInLakhsCompact(target.revenue_target)}
                      </span>
                    </div>
                    <div className="target-metric">
                      <span className="metric-label">Achieved</span>
                      <span className="metric-value achieved">
                        {formatInLakhsCompact(target.achievement_revenue)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(achievement, 100)}%`,
                          backgroundColor: achievement >= 100 ? '#10b981' : achievement >= 75 ? '#3b82f6' : '#f59e0b',
                        }}
                      />
                    </div>
                  </div>
                  <div className="target-footer">
                    <button
                      className="refresh-btn"
                      onClick={() => salesService.forecasting.calculateAchievements(target.id)}
                    >
                      <RefreshCw size={14} />
                      Recalculate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedForecast && (
          <div className="modal-overlay" onClick={() => setSelectedForecast(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedForecast.forecast_name}</h2>
                <button onClick={() => setSelectedForecast(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="forecast-details">
                  <div className="detail-section">
                    <h3>Forecast Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Type:</span>
                        <span>{selectedForecast.forecast_type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Period:</span>
                        <span>{selectedForecast.period_type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Forecasted Amount:</span>
                        <span>{formatInLakhsCompact(selectedForecast.forecasted_amount)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Actual Amount:</span>
                        <span>{formatInLakhsCompact(selectedForecast.actual_amount)}</span>
                      </div>
                      {selectedForecast.confidence_level && (
                        <div className="detail-item">
                          <span className="label">Confidence:</span>
                          <span>{selectedForecast.confidence_level}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showForecastForm && (
          <ForecastForm
            type={activeTab === 'forecasts' ? 'forecast' : 'target'}
            onClose={() => setShowForecastForm(false)}
            onSave={() => {
              setShowForecastForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

