import { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, Flame, CheckCircle, AlertCircle, Monitor } from 'lucide-react';

const API_BASE = '/api/pos/kitchen';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const priorityColors: Record<string, string> = { normal: '#888', rush: '#f59e0b', vip: '#ef4444' };
const statusColors: Record<string, string> = { pending: '#f59e0b', in_progress: '#3b82f6', ready: '#00C971', completed: '#666' };

export const KitchenDisplay: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ pending: 0, in_progress: 0, completed: 0, avg_prep_time: 0 });
  const [selectedStation, setSelectedStation] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const [o, s, st] = await Promise.all([
        apiFetch(`/orders${selectedStation ? `?station_id=${selectedStation}` : ''}`),
        apiFetch('/stations'),
        apiFetch('/stats'),
      ]);
      setOrders(o);
      setStations(s);
      setStats(st);
    } catch (e) { console.error(e); }
  }, [selectedStation]);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  const bumpOrder = async (id: string) => {
    try { await apiFetch(`/orders/${id}/bump`, { method: 'PUT' }); load(); } catch (e) { console.error(e); }
  };

  const updateItemStatus = async (orderId: string, itemIndex: number, status: string) => {
    try { await apiFetch(`/orders/${orderId}/items/${itemIndex}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); load(); } catch (e) { console.error(e); }
  };

  const cardStyle = { background: '#141414', borderRadius: 12, padding: 16, border: '1px solid #222' };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChefHat size={28} color="#00C971" /> Kitchen Display System
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>Real-time kitchen order management</p>
        </div>
        <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)} style={{ padding: '8px 14px', background: '#222', border: '1px solid #333', borderRadius: 8, color: '#fff' }}>
          <option value="">All Stations</option>
          {stations.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pending', value: stats.pending, icon: <AlertCircle size={20} color="#f59e0b" />, color: '#f59e0b' },
          { label: 'In Progress', value: stats.in_progress, icon: <Flame size={20} color="#3b82f6" />, color: '#3b82f6' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle size={20} color="#00C971" />, color: '#00C971' },
          { label: 'Avg Prep Time', value: formatTime(stats.avg_prep_time || 0), icon: <Clock size={20} color="#aaa" />, color: '#aaa' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#888', fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: s.color }}>{s.value}</div>
              </div>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Stations row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {stations.map((s: any) => (
          <div key={s._id} style={{ background: s.display_color + '22', border: `1px solid ${s.display_color}44`, borderRadius: 8, padding: '6px 14px', fontSize: 13, color: s.display_color || '#00C971', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Monitor size={14} /> {s.display_name || s.name} ({s.station_type})
          </div>
        ))}
      </div>

      {/* Orders grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {orders.map((order: any) => {
          const elapsed = order.received_at ? Math.round((Date.now() - new Date(order.received_at).getTime()) / 1000) : 0;
          return (
            <div key={order._id} style={{ ...cardStyle, borderTop: `3px solid ${priorityColors[order.priority] || '#888'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>#{order.order_number}</span>
                  {order.priority !== 'normal' && (
                    <span style={{ background: priorityColors[order.priority] + '22', color: priorityColors[order.priority], padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{order.priority}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#888', fontSize: 12 }}>
                  <Clock size={12} /> {formatTime(elapsed)}
                </div>
              </div>
              <div style={{ marginBottom: 10, fontSize: 12, color: statusColors[order.status], fontWeight: 600, textTransform: 'uppercase' }}>{order.status?.replace('_', ' ')}</div>
              <div style={{ marginBottom: 12 }}>
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{item.quantity}x {item.name}</span>
                      {item.notes && <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 2 }}>{item.notes}</div>}
                    </div>
                    <select value={item.status} onChange={e => updateItemStatus(order._id, idx, e.target.value)} style={{ padding: '3px 6px', background: '#0a0a0a', border: '1px solid #333', borderRadius: 4, color: statusColors[item.status] || '#fff', fontSize: 11 }}>
                      {['pending', 'preparing', 'ready', 'served'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={() => bumpOrder(order._id)} style={{ width: '100%', padding: '8px', background: '#00C971', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                BUMP
              </button>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#444' }}>
            <ChefHat size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>No active orders</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDisplay;
