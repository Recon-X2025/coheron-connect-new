import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calculator } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { apiService } from '../../../services/apiService';
import { formatInLakhsCompact } from '../../../utils/currencyFormatter';
import { showToast } from '../../../components/Toast';
import { SalaryComponentForm } from './SalaryComponentForm';
import './SalaryStructure.css';

export const SalaryStructure = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [componentType, setComponentType] = useState<'earning' | 'deduction'>('earning');
  const [editingComponent, setEditingComponent] = useState<any>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadSalaryStructure();
    } else {
      setSalaryStructure([]);
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const data = await apiService.get<any>('/employees');
      setEmployees(data);
      if (data.length > 0 && !selectedEmployee) {
        setSelectedEmployee(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalaryStructure = async () => {
    if (!selectedEmployee) return;
    try {
      const data = await apiService.getById<any>('/payroll/salary-structure', selectedEmployee);
      setSalaryStructure(data);
    } catch (error) {
      console.error('Failed to load salary structure:', error);
      setSalaryStructure([]);
    }
  };

  const earnings = salaryStructure.filter((s: any) => s.component_type === 'earning');
  const deductions = salaryStructure.filter((s: any) => s.component_type === 'deduction');

  const totalEarnings = earnings.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
  const totalDeductions = deductions.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
  const netSalary = totalEarnings - totalDeductions;

  const handleDeleteComponent = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      try {
        await apiService.delete('/payroll/salary-structure', id);
        loadSalaryStructure();
      } catch (error) {
        console.error('Failed to delete component:', error);
        showToast('Failed to delete component', 'error');
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="salary-structure">
      <div className="section-header">
        <div className="header-actions">
          <select 
            className="employee-select"
            value={selectedEmployee || ''}
            onChange={(e) => setSelectedEmployee(Number(e.target.value))}
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employee_id})
              </option>
            ))}
          </select>
          <Button icon={<Calculator size={18} />}>Calculate</Button>
          <Button icon={<Plus size={18} />} onClick={() => {
            if (!selectedEmployee) {
              showToast('Please select an employee first', 'warning');
              return;
            }
            setComponentType('earning');
            setEditingComponent(null);
            setShowComponentForm(true);
          }}>
            Add Component
          </Button>
        </div>
      </div>

      <div className="salary-grid">
        <Card className="earnings-card">
          <div className="card-header">
            <h3>Earnings Components</h3>
            <span className="total-amount">Total: {formatInLakhsCompact(totalEarnings)}</span>
          </div>
          <div className="components-list">
            {earnings.length > 0 ? (
              earnings.map((item: any) => (
                <div key={item.id} className="component-item">
                  <div className="component-info">
                    <span className="component-name">{item.component_name}</span>
                    {item.calculation_type === 'percentage' && item.percentage && (
                      <span className="component-type">({item.percentage}% of Basic)</span>
                    )}
                  </div>
                  <div className="component-amount">{formatInLakhsCompact(parseFloat(item.amount || 0))}</div>
                  <div className="component-actions">
                    <button onClick={() => {
                      setEditingComponent(item);
                      setComponentType(item.component_type);
                      setShowComponentForm(true);
                    }}><Edit size={14} /></button>
                    <button className="delete" onClick={() => handleDeleteComponent(item.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">No earnings components defined</p>
            )}
            <Button variant="ghost" icon={<Plus size={16} />} fullWidth onClick={() => {
              if (!selectedEmployee) {
                showToast('Please select an employee first', 'warning');
                return;
              }
              setComponentType('earning');
              setEditingComponent(null);
              setShowComponentForm(true);
            }}>
              Add Earning Component
            </Button>
          </div>
        </Card>

        <Card className="deductions-card">
          <div className="card-header">
            <h3>Deduction Components</h3>
            <span className="total-amount">Total: {formatInLakhsCompact(totalDeductions)}</span>
          </div>
          <div className="components-list">
            {deductions.map((item) => (
              <div key={item.id} className="component-item">
                <div className="component-info">
                  <span className="component-name">{item.component}</span>
                  {item.type === 'percentage' && (
                    <span className="component-type">({item.percentage}% of Basic)</span>
                  )}
                  {item.type === 'calculated' && (
                    <span className="component-type">(Calculated)</span>
                  )}
                </div>
                <div className="component-amount">{formatInLakhsCompact(item.amount)}</div>
                <div className="component-actions">
                  <button><Edit size={14} /></button>
                  <button className="delete"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            <Button variant="ghost" icon={<Plus size={16} />} fullWidth onClick={() => {
              if (!selectedEmployee) {
                showToast('Please select an employee first', 'warning');
                return;
              }
              setComponentType('deduction');
              setEditingComponent(null);
              setShowComponentForm(true);
            }}>
              Add Deduction Component
            </Button>
          </div>
        </Card>
      </div>

      <Card className="summary-card">
        <div className="salary-summary">
          <div className="summary-row">
            <span>Gross Salary (CTC)</span>
            <span className="amount">{formatInLakhsCompact(totalEarnings)}</span>
          </div>
          <div className="summary-row">
            <span>Total Deductions</span>
            <span className="amount deductions">- {formatInLakhsCompact(totalDeductions)}</span>
          </div>
          <div className="summary-row total">
            <span>Net Salary</span>
            <span className="amount net">{formatInLakhsCompact(netSalary)}</span>
          </div>
        </div>
      </Card>

      {showComponentForm && selectedEmployee && (
        <SalaryComponentForm
          employeeId={selectedEmployee}
          componentType={componentType}
          initialData={editingComponent}
          onClose={() => {
            setShowComponentForm(false);
            setEditingComponent(null);
          }}
          onSave={() => {
            setShowComponentForm(false);
            setEditingComponent(null);
            loadSalaryStructure();
          }}
        />
      )}
    </div>
  );
};

