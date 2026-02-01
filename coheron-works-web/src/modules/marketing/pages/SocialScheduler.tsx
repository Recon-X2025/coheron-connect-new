import React, { useState } from 'react';
import { Plus, Calendar, Clock, Send, Facebook, Instagram, Twitter, Linkedin, RefreshCw, BarChart3, Link2, Users, TrendingUp } from 'lucide-react';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', color: '#1877f2', icon: <Facebook size={16} /> },
  { id: 'instagram', label: 'Instagram', color: '#e4405f', icon: <Instagram size={16} /> },
  { id: 'twitter', label: 'Twitter / X', color: '#1da1f2', icon: <Twitter size={16} /> },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', icon: <Linkedin size={16} /> },
  { id: 'tiktok', label: 'TikTok', color: '#000', icon: <TrendingUp size={16} /> },
];

interface Post {
  id: string;
  content: string;
  platforms: string[];
  scheduled_at: string;
  status: 'draft' | 'scheduled' | 'published';
  engagement: { likes: number; comments: number; shares: number };
}

const SAMPLE_POSTS: Post[] = [
  { id: '1', content: 'Excited to announce our new feature launch! Check out the blog for details.', platforms: ['twitter', 'linkedin'], scheduled_at: '2026-02-03T10:00', status: 'scheduled', engagement: { likes: 0, comments: 0, shares: 0 } },
  { id: '2', content: 'Behind the scenes at our office - meet the team!', platforms: ['instagram', 'facebook'], scheduled_at: '2026-02-04T14:00', status: 'scheduled', engagement: { likes: 0, comments: 0, shares: 0 } },
  { id: '3', content: 'Our latest case study is live. See how Company X grew 300%.', platforms: ['linkedin'], scheduled_at: '2026-01-28T09:00', status: 'published', engagement: { likes: 142, comments: 23, shares: 45 } },
  { id: '4', content: 'Tips for marketing automation in 2026 - thread incoming!', platforms: ['twitter'], scheduled_at: '2026-01-29T11:00', status: 'published', engagement: { likes: 89, comments: 12, shares: 34 } },
];

const ACCOUNTS = [
  { id: '1', platform: 'facebook', account_name: 'Coheron Official', followers_count: 12400, is_connected: true },
  { id: '2', platform: 'instagram', account_name: '@coheron_hq', followers_count: 8200, is_connected: true },
  { id: '3', platform: 'twitter', account_name: '@CoheronERP', followers_count: 5600, is_connected: true },
  { id: '4', platform: 'linkedin', account_name: 'Coheron Inc.', followers_count: 3400, is_connected: true },
  { id: '5', platform: 'tiktok', account_name: '@coheron', followers_count: 1200, is_connected: false },
];

const PLATFORM_ANALYTICS = [
  { platform: 'LinkedIn', likes: 2340, comments: 412, shares: 890, impressions: 45000, color: '#0a66c2' },
  { platform: 'Twitter', likes: 1890, comments: 234, shares: 567, impressions: 38000, color: '#1da1f2' },
  { platform: 'Facebook', likes: 1560, comments: 345, shares: 234, impressions: 32000, color: '#1877f2' },
  { platform: 'Instagram', likes: 3200, comments: 567, shares: 123, impressions: 28000, color: '#e4405f' },
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export const SocialScheduler: React.FC = () => {
  const [tab, setTab] = useState<'calendar' | 'queue' | 'accounts' | 'analytics'>('calendar');
  const [showComposer, setShowComposer] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');

  const [calYear] = useState(2026);
  const [calMonth] = useState(1); // Feb
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const togglePlatform = (id: string) => setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const postsOnDate = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return SAMPLE_POSTS.filter(p => p.scheduled_at.startsWith(dateStr));
  };

  const maxEng = Math.max(...PLATFORM_ANALYTICS.map(p => p.impressions));

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Social Scheduler</h1>
          <p style={{ color: '#999', margin: '4px 0 0', fontSize: 14 }}>Schedule and manage posts across all platforms</p>
        </div>
        <button onClick={() => setShowComposer(!showComposer)} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Composer */}
      {showComposer && (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Compose Post</h3>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="What's on your mind?" rows={4}
            style={{ width: '100%', padding: 14, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, resize: 'vertical', marginBottom: 16, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {PLATFORMS.map((p, idx) => (
              <button key={p.id || (p as any)._id || idx} onClick={() => togglePlatform(p.id)} style={{
                padding: '8px 14px', borderRadius: 8, border: `1px solid ${selectedPlatforms.includes(p.id) ? p.color : '#333'}`,
                background: selectedPlatforms.includes(p.id) ? `${p.color}22` : 'transparent', color: selectedPlatforms.includes(p.id) ? p.color : '#999',
                cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              style={{ padding: '8px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Schedule
            </button>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={14} /> Publish Now
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #222', paddingBottom: 0 }}>
        {([['calendar', 'Calendar', <Calendar size={15} key="c" />], ['queue', 'Queue', <Clock size={15} key="q" />], ['accounts', 'Accounts', <Link2 size={15} key="a" />], ['analytics', 'Analytics', <BarChart3 size={15} key="an" />]] as const).map(([key, label, icon]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            padding: '10px 18px', border: 'none', borderBottom: tab === key ? '2px solid #00C971' : '2px solid transparent',
            background: 'transparent', color: tab === key ? '#00C971' : '#999', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, fontWeight: tab === key ? 600 : 400,
          }}>{icon} {label}</button>
        ))}
      </div>

      {/* Calendar */}
      {tab === 'calendar' && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>February 2026</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ padding: 8, textAlign: 'center', color: '#666', fontSize: 12, fontWeight: 600 }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const posts = postsOnDate(day);
              return (
                <div key={day} style={{ background: '#141414', border: '1px solid #222', borderRadius: 8, minHeight: 80, padding: 8 }}>
                  <div style={{ fontSize: 13, color: day === 1 ? '#00C971' : '#999', marginBottom: 4 }}>{day}</div>
                  {posts.map((p, idx) => (
                    <div key={p.id || (p as any)._id || idx} style={{ fontSize: 11, padding: '3px 6px', background: '#1a1a1a', borderRadius: 4, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ccc' }}>
                      {p.content.slice(0, 25)}...
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Queue */}
      {tab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SAMPLE_POSTS.filter(p => p.status === 'scheduled').map((p, idx) => (
            <div key={p.id || (p as any)._id || idx} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} color="#00C971" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, marginBottom: 6 }}>{p.content}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {p.platforms.map(pl => {
                    const pf = PLATFORMS.find(x => x.id === pl);
                    return pf ? <span key={pl} style={{ color: pf.color, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{pf.icon} {pf.label}</span> : null;
                  })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#999', fontSize: 13 }}>{new Date(p.scheduled_at).toLocaleDateString()}</div>
                <div style={{ color: '#00C971', fontSize: 13 }}>{new Date(p.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accounts */}
      {tab === 'accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {ACCOUNTS.map((a, idx) => {
            const pf = PLATFORMS.find(p => p.id === a.platform);
            return (
              <div key={a.id || (a as any)._id || idx} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${pf?.color || '#333'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pf?.color }}>{pf?.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.account_name}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>{pf?.label}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#999', fontSize: 13 }}><Users size={14} /> {a.followers_count.toLocaleString()} followers</div>
                  <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, background: a.is_connected ? '#22c55e22' : '#ef444422', color: a.is_connected ? '#22c55e' : '#ef4444' }}>
                    {a.is_connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {!a.is_connected && (
                  <button style={{ marginTop: 12, width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RefreshCw size={14} /> Reconnect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <div>
          <h3 style={{ margin: '0 0 20px', fontSize: 16 }}>Engagement by Platform</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PLATFORM_ANALYTICS.map(p => (
              <div key={p.platform} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{p.platform}</span>
                  <span style={{ color: '#999', fontSize: 13 }}>{p.impressions.toLocaleString()} impressions</span>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 6, height: 24, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ background: p.color, height: '100%', width: `${(p.impressions / maxEng) * 100}%`, borderRadius: 6, transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div><span style={{ color: '#999', fontSize: 11 }}>Likes</span><div style={{ fontWeight: 600, fontSize: 14 }}>{p.likes.toLocaleString()}</div></div>
                  <div><span style={{ color: '#999', fontSize: 11 }}>Comments</span><div style={{ fontWeight: 600, fontSize: 14 }}>{p.comments.toLocaleString()}</div></div>
                  <div><span style={{ color: '#999', fontSize: 11 }}>Shares</span><div style={{ fontWeight: 600, fontSize: 14 }}>{p.shares.toLocaleString()}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialScheduler;
