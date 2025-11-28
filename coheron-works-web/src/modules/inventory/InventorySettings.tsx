import { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { Button } from '../../components/Button';
import './InventorySettings.css';

export const InventorySettings = () => {
  const [settings, setSettings] = useState({
    default_removal_strategy: 'fifo',
    default_cost_method: 'fifo',
    auto_create_lots: false,
    auto_assign_lots: false,
    require_qc_on_grn: false,
    require_approval_for_adjustments: true,
    adjustment_approval_threshold: 10000,
    enable_abc_analysis: true,
    enable_cycle_counting: true,
    cycle_count_frequency_days: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement settings save
    alert('Settings saved successfully!');
  };

  return (
    <div className="inventory-settings-page">
      <div className="settings-header">
        <Settings size={24} />
        <h2>Inventory Settings</h2>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-section">
          <h3>Stock Management</h3>
          <div className="form-group">
            <label>Default Removal Strategy</label>
            <select
              value={settings.default_removal_strategy}
              onChange={(e) => setSettings({ ...settings, default_removal_strategy: e.target.value })}
            >
              <option value="fifo">FIFO (First In First Out)</option>
              <option value="lifo">LIFO (Last In First Out)</option>
              <option value="fefo">FEFO (First Expiry First Out)</option>
              <option value="closest">Closest Location</option>
            </select>
          </div>

          <div className="form-group">
            <label>Default Costing Method</label>
            <select
              value={settings.default_cost_method}
              onChange={(e) => setSettings({ ...settings, default_cost_method: e.target.value })}
            >
              <option value="fifo">FIFO</option>
              <option value="lifo">LIFO</option>
              <option value="average">Average Cost</option>
              <option value="standard">Standard Cost</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Batch/Lot Management</h3>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.auto_create_lots}
                onChange={(e) => setSettings({ ...settings, auto_create_lots: e.target.checked })}
              />
              Auto-create lots on receipt
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.auto_assign_lots}
                onChange={(e) => setSettings({ ...settings, auto_assign_lots: e.target.checked })}
              />
              Auto-assign lots to stock moves
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Quality Control</h3>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.require_qc_on_grn}
                onChange={(e) => setSettings({ ...settings, require_qc_on_grn: e.target.checked })}
              />
              Require QC inspection on GRN
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Approvals</h3>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.require_approval_for_adjustments}
                onChange={(e) => setSettings({ ...settings, require_approval_for_adjustments: e.target.checked })}
              />
              Require approval for stock adjustments
            </label>
          </div>

          <div className="form-group">
            <label>Adjustment Approval Threshold (₹)</label>
            <input
              type="number"
              value={settings.adjustment_approval_threshold}
              onChange={(e) => setSettings({ ...settings, adjustment_approval_threshold: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Analytics & Reports</h3>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enable_abc_analysis}
                onChange={(e) => setSettings({ ...settings, enable_abc_analysis: e.target.checked })}
              />
              Enable ABC/XYZ Analysis
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enable_cycle_counting}
                onChange={(e) => setSettings({ ...settings, enable_cycle_counting: e.target.checked })}
              />
              Enable Cycle Counting
            </label>
          </div>

          <div className="form-group">
            <label>Cycle Count Frequency (days)</label>
            <input
              type="number"
              value={settings.cycle_count_frequency_days}
              onChange={(e) => setSettings({ ...settings, cycle_count_frequency_days: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="form-actions">
          <Button type="submit" icon={<Save size={18} />}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

