import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '../../../components/Button';

const API = import.meta.env.VITE_API_URL || '';

interface PricingPlan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  plan_type: 'tier' | 'industry' | 'addon';
  tier_level: number;
  industry?: string;
  included_modules: string[];
  max_users: number;
  storage_gb: number;
  features: string[];
  base_price_monthly: number;
  base_price_annual: number;
  per_user_price: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  cta_label: string;
  cta_link: string;
}

interface ModulePrice {
  _id: string;
  module_name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  category: 'core' | 'advanced' | 'premium';
  icon: string;
  features: string[];
  is_active: boolean;
}

const AVAILABLE_MODULES = [
  'crm', 'sales', 'support', 'hr', 'manufacturing', 'inventory',
  'accounting', 'marketing', 'projects', 'pos', 'website', 'esignature', 'platform', 'ai',
];

const emptyPlan: Omit<PricingPlan, '_id'> = {
  name: '', slug: '', description: '', plan_type: 'tier', tier_level: 1,
  included_modules: [], max_users: 0, storage_gb: 0, features: [],
  base_price_monthly: 0, base_price_annual: 0, per_user_price: 0,
  is_featured: false, is_active: true, display_order: 0,
  cta_label: 'Get Started', cta_link: '/signup',
};

export const PlanManager: React.FC = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [modules, setModules] = useState<ModulePrice[]>([]);
  const [tab, setTab] = useState<'plans' | 'modules'>('plans');
  const [editing, setEditing] = useState<Partial<PricingPlan> | null>(null);
  const [editModule, setEditModule] = useState<ModulePrice | null>(null);

  const token = localStorage.getItem('authToken') || '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API}/pricing-plans`, { headers });
      if (res.ok) setPlans(await res.json());
    } catch { /* */ }
  }, []);

  const loadModules = useCallback(async () => {
    try {
      const res = await fetch(`${API}/module-prices`, { headers });
      if (res.ok) setModules(await res.json());
    } catch { /* */ }
  }, []);

  useEffect(() => { loadPlans(); loadModules(); }, [loadPlans, loadModules]);

  const savePlan = async () => {
    if (!editing) return;
    const isNew = !('_id' in editing && editing._id);
    const url = isNew ? `${API}/pricing-plans` : `${API}/pricing-plans/${editing._id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers, body: JSON.stringify(editing) });
    if (res.ok) { setEditing(null); loadPlans(); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    await fetch(`${API}/pricing-plans/${id}`, { method: 'DELETE', headers });
    loadPlans();
  };

  const saveModule = async () => {
    if (!editModule) return;
    const res = await fetch(`${API}/module-prices/${editModule.module_name}`, {
      method: 'PUT', headers, body: JSON.stringify(editModule),
    });
    if (res.ok) { setEditModule(null); loadModules(); }
  };

  const toggleFeature = (val: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24 }}>Plan Manager</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <Button variant={tab === 'plans' ? 'primary' : 'secondary'} onClick={() => setTab('plans')}>
          Pricing Plans
        </Button>
        <Button variant={tab === 'modules' ? 'primary' : 'secondary'} onClick={() => setTab('modules')}>
          Module Prices
        </Button>
      </div>

      {tab === 'plans' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2>Pricing Plans ({plans.length})</h2>
            <Button icon={<Plus size={16} />} onClick={() => setEditing({ ...emptyPlan })}>
              Add Plan
            </Button>
          </div>

          {editing && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h3>{editing._id ? 'Edit Plan' : 'New Plan'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <label>
                  Name
                  <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Slug
                  <input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Type
                  <select value={editing.plan_type || 'tier'} onChange={e => setEditing({ ...editing, plan_type: e.target.value as any })} style={inputStyle}>
                    <option value="tier">Tier</option>
                    <option value="industry">Industry</option>
                    <option value="addon">Add-on</option>
                  </select>
                </label>
                <label>
                  Tier Level
                  <input type="number" value={editing.tier_level || 0} onChange={e => setEditing({ ...editing, tier_level: +e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Industry
                  <input value={editing.industry || ''} onChange={e => setEditing({ ...editing, industry: e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Monthly Price (₹)
                  <input type="number" value={editing.base_price_monthly || 0} onChange={e => setEditing({ ...editing, base_price_monthly: +e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Annual Price (₹)
                  <input type="number" value={editing.base_price_annual || 0} onChange={e => setEditing({ ...editing, base_price_annual: +e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Max Users (0=unlimited)
                  <input type="number" value={editing.max_users || 0} onChange={e => setEditing({ ...editing, max_users: +e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Storage GB (0=unlimited)
                  <input type="number" value={editing.storage_gb || 0} onChange={e => setEditing({ ...editing, storage_gb: +e.target.value })} style={inputStyle} />
                </label>
                <label>
                  Display Order
                  <input type="number" value={editing.display_order || 0} onChange={e => setEditing({ ...editing, display_order: +e.target.value })} style={inputStyle} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Description
                  <input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Features (comma-separated)
                  <input
                    value={(editing.features || []).join(', ')}
                    onChange={e => setEditing({ ...editing, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    style={inputStyle}
                  />
                </label>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Included Modules</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {AVAILABLE_MODULES.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleFeature(m, editing.included_modules || [], v => setEditing({ ...editing, included_modules: v }))}
                        style={{
                          padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-light)',
                          background: (editing.included_modules || []).includes(m) ? 'var(--color-primary)' : 'transparent',
                          color: (editing.included_modules || []).includes(m) ? 'white' : 'var(--text-muted)',
                          cursor: 'pointer', fontSize: '0.8rem', textTransform: 'capitalize',
                        }}
                      >{m}</button>
                    ))}
                  </div>
                </div>
                <label>
                  <input type="checkbox" checked={editing.is_featured || false} onChange={e => setEditing({ ...editing, is_featured: e.target.checked })} />
                  {' '}Featured
                </label>
                <label>
                  <input type="checkbox" checked={editing.is_active !== false} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
                  {' '}Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Button icon={<Save size={16} />} onClick={savePlan}>Save</Button>
                <Button variant="ghost" icon={<X size={16} />} onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plans.map(plan => (
              <div key={plan._id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{plan.name}</strong>
                  <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{plan.plan_type}</span>
                  <span style={{ marginLeft: 8, fontSize: '0.85rem' }}>₹{plan.base_price_monthly.toLocaleString('en-IN')}/mo</span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {plan.included_modules.join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(plan)}>Edit</Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => deletePlan(plan._id)}>Delete</Button>
                </div>
              </div>
            ))}
            {plans.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No plans yet. Add your first plan above.</p>}
          </div>
        </>
      )}

      {tab === 'modules' && (
        <>
          <h2 style={{ marginBottom: 16 }}>Module Prices ({modules.length})</h2>

          {editModule && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h3>Edit {editModule.display_name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <label>Display Name<input value={editModule.display_name} onChange={e => setEditModule({ ...editModule, display_name: e.target.value })} style={inputStyle} /></label>
                <label>
                  Category
                  <select value={editModule.category} onChange={e => setEditModule({ ...editModule, category: e.target.value as any })} style={inputStyle}>
                    <option value="core">Core</option>
                    <option value="advanced">Advanced</option>
                    <option value="premium">Premium</option>
                  </select>
                </label>
                <label>Monthly Price (₹)<input type="number" value={editModule.price_monthly} onChange={e => setEditModule({ ...editModule, price_monthly: +e.target.value })} style={inputStyle} /></label>
                <label>Annual Price (₹)<input type="number" value={editModule.price_annual} onChange={e => setEditModule({ ...editModule, price_annual: +e.target.value })} style={inputStyle} /></label>
                <label style={{ gridColumn: '1 / -1' }}>Description<input value={editModule.description} onChange={e => setEditModule({ ...editModule, description: e.target.value })} style={inputStyle} /></label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Features (comma-separated)
                  <input value={editModule.features.join(', ')} onChange={e => setEditModule({ ...editModule, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={inputStyle} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Button icon={<Save size={16} />} onClick={saveModule}>Save</Button>
                <Button variant="ghost" icon={<X size={16} />} onClick={() => setEditModule(null)}>Cancel</Button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modules.map(mod => (
              <div key={mod._id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{mod.display_name}</strong>
                  <span style={{ marginLeft: 8, fontSize: '0.75rem', textTransform: 'uppercase', color: mod.category === 'core' ? '#10b981' : mod.category === 'advanced' ? '#6366f1' : '#f59e0b' }}>{mod.category}</span>
                  <span style={{ marginLeft: 8 }}>₹{mod.price_monthly.toLocaleString('en-IN')}/mo</span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{mod.description}</div>
                </div>
                <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditModule(mod)}>Edit</Button>
              </div>
            ))}
            {modules.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No module prices found. Seed them via the API.</p>}
          </div>
        </>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-light)',
  background: 'var(--bg-main)',
  color: 'var(--text-main)',
  marginTop: 4,
  fontSize: '0.9rem',
};

export default PlanManager;
