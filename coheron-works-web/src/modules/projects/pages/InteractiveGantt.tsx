import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus, Diamond, ChevronLeft, ChevronRight,
  AlertTriangle, Save,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────

interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string[];
  parent: string | null;
  assignee_name: string | null;
  milestone: boolean;
  color: string;
  status: string;
}

interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: string;
}

type ZoomLevel = 'day' | 'week' | 'month';

// ── Helpers ─────────────────────────────────────────────────────────

const DAY_MS = 86400000;

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY_MS));
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s: string) {
  return new Date(s);
}

const getHeaders = async (method = 'GET') => {
  const token = localStorage.getItem('authToken') || '';
  const h: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  if (!['GET','HEAD','OPTIONS'].includes(method.toUpperCase())) {
    try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { h['x-csrf-token'] = (await r.json()).token; } } catch {}
  }
  return h;
};

// ── Component ───────────────────────────────────────────────────────

export const InteractiveGantt: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [links, setLinks] = useState<GanttLink[]>([]);
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<{ taskId: string; type: 'move' | 'resize'; startX: number; origStart: Date; origEnd: Date } | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [_scrollOffset, setScrollOffset] = useState(0);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const pid = projectId || new URLSearchParams(window.location.search).get('projectId') || '';

  // ── Fetch ───────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!pid) { setError('No project ID'); setLoading(false); return; }
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/gantt/${pid}`, { headers: await getHeaders() });
      if (!res.ok) throw new Error('Failed to load gantt data');
      const data = await res.json();
      setTasks(data.tasks || []);
      setLinks(data.links || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ────────────────────────────────────────────────

  const colWidth = zoom === 'day' ? 40 : zoom === 'week' ? 20 : 8;
  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 50;
  const LEFT_PANEL_W = 240;

  const { minDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: addDays(now, 30), totalDays: 30 };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const t of tasks) {
      const s = parseDate(t.start).getTime();
      const e = parseDate(t.end).getTime();
      if (s < min) min = s;
      if (e > max) max = e;
    }
    const minD = addDays(new Date(min), -3);
    const maxD = addDays(new Date(max), 7);
    return { minDate: minD, maxDate: maxD, totalDays: daysBetween(minD, maxD) };
  }, [tasks]);

  const chartWidth = totalDays * colWidth;
  const chartHeight = HEADER_HEIGHT + tasks.length * ROW_HEIGHT + 40;

  // ── Critical path (simplified: longest path) ──────────────────────

  const criticalTaskIds = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const adjList = new Map<string, string[]>();
    for (const l of links) {
      if (!adjList.has(l.source)) adjList.set(l.source, []);
      adjList.get(l.source)!.push(l.target);
    }
    // Find longest path via DFS
    const memo = new Map<string, { len: number; path: string[] }>();
    function dfs(id: string): { len: number; path: string[] } {
      if (memo.has(id)) return memo.get(id)!;
      const t = taskMap.get(id);
      if (!t) { memo.set(id, { len: 0, path: [] }); return { len: 0, path: [] }; }
      const dur = daysBetween(parseDate(t.start), parseDate(t.end));
      const children = adjList.get(id) || [];
      if (children.length === 0) {
        const r = { len: dur, path: [id] };
        memo.set(id, r); return r;
      }
      let best = { len: 0, path: [] as string[] };
      for (const c of children) {
        const sub = dfs(c);
        if (sub.len > best.len) best = sub;
      }
      const r = { len: dur + best.len, path: [id, ...best.path] };
      memo.set(id, r);
      return r;
    }
    let longest = { len: 0, path: [] as string[] };
    for (const t of tasks) {
      const r = dfs(t.id);
      if (r.len > longest.len) longest = r;
    }
    return new Set(longest.path);
  }, [tasks, links, showCriticalPath]);

  // ── Task position helpers ─────────────────────────────────────────

  function taskX(t: GanttTask) {
    return daysBetween(minDate, parseDate(t.start)) * colWidth;
  }
  function taskW(t: GanttTask) {
    return Math.max(colWidth, daysBetween(parseDate(t.start), parseDate(t.end)) * colWidth);
  }
  function taskY(idx: number) {
    return HEADER_HEIGHT + idx * ROW_HEIGHT + 4;
  }

  // ── Drag handlers ─────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setDragging({ taskId, type, startX: e.clientX, origStart: parseDate(task.start), origEnd: parseDate(task.end) });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dayDelta = Math.round(dx / colWidth);
    setTasks(prev => prev.map(t => {
      if (t.id !== dragging.taskId) return t;
      if (dragging.type === 'move') {
        return { ...t, start: formatDate(addDays(dragging.origStart, dayDelta)), end: formatDate(addDays(dragging.origEnd, dayDelta)) };
      } else {
        const newEnd = addDays(dragging.origEnd, dayDelta);
        if (newEnd <= dragging.origStart) return t;
        return { ...t, end: formatDate(newEnd) };
      }
    }));
  }, [dragging, colWidth]);

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return;
    const task = tasks.find(t => t.id === dragging.taskId);
    if (task) {
      try {
        await fetch(`/api/projects/gantt/${pid}/tasks/${task.id}`, {
          method: 'PUT', headers: await getHeaders('PUT'), body: JSON.stringify({ start: task.start, end: task.end }),
        });
      } catch { /* silent */ }
    }
    setDragging(null);
  }, [dragging, tasks, pid]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // ── Create inline task ────────────────────────────────────────────

  const createTask = async () => {
    if (!newTaskName.trim()) return;
    const start = formatDate(new Date());
    const end = formatDate(addDays(new Date(), 7));
    const newTask: GanttTask = {
      id: 'new-' + Date.now(), name: newTaskName, start, end, progress: 0,
      dependencies: [], parent: null, assignee_name: null, milestone: false, color: '#2196f3', status: 'todo',
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskName('');
    setShowNewTask(false);
    // Persist via API (best effort)
    try {
      await fetch(`/api/projects/tasks`, {
        method: 'POST', headers: await getHeaders('POST'),
        body: JSON.stringify({ project_id: pid, name: newTaskName, planned_start_date: start, planned_end_date: end }),
      });
      fetchData();
    } catch { /* silent */ }
  };

  // ── Render grid columns ───────────────────────────────────────────

  const renderTimeHeader = () => {
    const cols = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(minDate, i);
      const x = i * colWidth;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      // Background stripe
      cols.push(<rect key={`bg-${i}`} x={x} y={HEADER_HEIGHT} width={colWidth} height={chartHeight - HEADER_HEIGHT}
        fill={isWeekend ? 'rgba(255,255,255,0.03)' : 'transparent'} />);
      // Header labels
      if (zoom === 'day' || (zoom === 'week' && d.getDay() === 1) || (zoom === 'month' && d.getDate() === 1)) {
        const label = zoom === 'month' ? d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
          : zoom === 'week' ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
          : d.getDate().toString();
        cols.push(<text key={`lbl-${i}`} x={x + 2} y={HEADER_HEIGHT - 8} fill="#939393" fontSize={10}>{label}</text>);
        cols.push(<line key={`ln-${i}`} x1={x} y1={HEADER_HEIGHT - 20} x2={x} y2={chartHeight} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />);
      }
    }
    // Today line
    const todayOffset = daysBetween(minDate, new Date()) * colWidth;
    if (todayOffset > 0 && todayOffset < chartWidth) {
      cols.push(<line key="today" x1={todayOffset} y1={HEADER_HEIGHT} x2={todayOffset} y2={chartHeight} stroke="#00C971" strokeWidth={1.5} strokeDasharray="4 2" />);
    }
    return cols;
  };

  // ── Render dependency arrows ──────────────────────────────────────

  const renderLinks = () => {
    return links.map((link, lIdx) => {
      const srcIdx = tasks.findIndex(t => t.id === link.source);
      const tgtIdx = tasks.findIndex(t => t.id === link.target);
      if (srcIdx < 0 || tgtIdx < 0) return null;
      const src = tasks[srcIdx];
      const tgt = tasks[tgtIdx];
      const x1 = taskX(src) + taskW(src);
      const y1 = taskY(srcIdx) + ROW_HEIGHT / 2 - 2;
      const x2 = taskX(tgt);
      const y2 = taskY(tgtIdx) + ROW_HEIGHT / 2 - 2;
      const midX = x1 + 12;
      const path = `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;
      return <g key={link.id || (link as any)._id || lIdx}>
        <path d={path} fill="none" stroke="#939393" strokeWidth={1.2} markerEnd="url(#arrowhead)" />
      </g>;
    });
  };

  // ── Render task bars ──────────────────────────────────────────────

  const renderTasks = () => {
    return tasks.map((task, idx) => {
      const x = taskX(task);
      const y = taskY(idx);
      const w = taskW(task);
      const barH = 24;
      const isCritical = criticalTaskIds.has(task.id);
      const barColor = isCritical ? '#ff4444' : task.color;

      if (task.milestone) {
        // Diamond marker
        const cx = x + w / 2;
        const cy = y + barH / 2;
        return <g key={task.id || (task as any)._id || idx}>
          <polygon points={`${cx},${cy - 10} ${cx + 10},${cy} ${cx},${cy + 10} ${cx - 10},${cy}`}
            fill="#e91e63" stroke="#fff" strokeWidth={0.5} />
          <text x={cx + 14} y={cy + 4} fill="#fff" fontSize={11}>{task.name}</text>
        </g>;
      }

      return <g key={task.id || (task as any)._id || idx}>
        {/* Bar background */}
        <rect x={x} y={y} width={w} height={barH} rx={4} fill={barColor} opacity={0.3}
          style={{ cursor: 'grab' }}
          onMouseDown={e => handleMouseDown(e, task.id, 'move')} />
        {/* Progress fill */}
        <rect x={x} y={y} width={w * task.progress / 100} height={barH} rx={4} fill={barColor} opacity={0.8} style={{ pointerEvents: 'none' }} />
        {/* Resize handle on right edge */}
        <rect x={x + w - 6} y={y} width={8} height={barH} fill="transparent" style={{ cursor: 'ew-resize' }}
          onMouseDown={e => handleMouseDown(e, task.id, 'resize')} />
        {/* Label */}
        <text x={x + 6} y={y + barH / 2 + 4} fill="#fff" fontSize={11} style={{ pointerEvents: 'none' }}>
          {task.name.length > 20 ? task.name.slice(0, 18) + '..' : task.name}
        </text>
        {/* Progress text */}
        {task.progress > 0 && (
          <text x={x + w + 6} y={y + barH / 2 + 4} fill="#939393" fontSize={10}>{task.progress}%</text>
        )}
        {/* Critical path indicator */}
        {isCritical && <rect x={x} y={y + barH - 3} width={w} height={3} rx={1.5} fill="#ff4444" />}
      </g>;
    });
  };

  // ── Styles ────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = { background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: 24 };
  const toolbarStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' };
  const btnStyle: React.CSSProperties = { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 };
  const btnActiveStyle: React.CSSProperties = { ...btnStyle, background: '#00C971', color: '#000', borderColor: '#00C971' };
  const inputStyle: React.CSSProperties = { background: '#141414', border: '1px solid #333', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 13, outline: 'none' };

  if (loading) return <div style={containerStyle}><div style={{ textAlign: 'center', padding: 60, color: '#939393' }}>Loading Gantt chart...</div></div>;
  if (error) return <div style={containerStyle}><div style={{ textAlign: 'center', padding: 60, color: '#ff4444' }}>{error}</div></div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Interactive Gantt Chart</h1>
        <span style={{ color: '#939393', fontSize: 13 }}>{tasks.length} tasks</span>
      </div>

      {/* Toolbar */}
      <div style={toolbarStyle}>
        <button style={zoom === 'day' ? btnActiveStyle : btnStyle} onClick={() => setZoom('day')}>Day</button>
        <button style={zoom === 'week' ? btnActiveStyle : btnStyle} onClick={() => setZoom('week')}>Week</button>
        <button style={zoom === 'month' ? btnActiveStyle : btnStyle} onClick={() => setZoom('month')}>Month</button>
        <div style={{ width: 1, height: 24, background: '#333' }} />
        <button style={btnStyle} onClick={() => setScrollOffset(o => Math.max(0, o - 200))}><ChevronLeft size={14} /> Scroll</button>
        <button style={btnStyle} onClick={() => setScrollOffset(o => o + 200)}>Scroll <ChevronRight size={14} /></button>
        <div style={{ width: 1, height: 24, background: '#333' }} />
        <button style={showCriticalPath ? btnActiveStyle : btnStyle} onClick={() => setShowCriticalPath(!showCriticalPath)}>
          <AlertTriangle size={14} /> Critical Path
        </button>
        <button style={btnStyle} onClick={() => setShowNewTask(true)}><Plus size={14} /> Add Task</button>
        <button style={btnStyle} onClick={fetchData}><Save size={14} /> Refresh</button>
      </div>

      {/* Inline new task */}
      {showNewTask && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={inputStyle} placeholder="Task name..." value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createTask(); if (e.key === 'Escape') setShowNewTask(false); }}
            autoFocus />
          <button style={{ ...btnStyle, background: '#00C971', color: '#000', borderColor: '#00C971' }} onClick={createTask}>Create</button>
          <button style={btnStyle} onClick={() => setShowNewTask(false)}>Cancel</button>
        </div>
      )}

      {/* Chart */}
      <div style={{ display: 'flex', border: '1px solid #222', borderRadius: 8, overflow: 'hidden' }}>
        {/* Left panel: task list */}
        <div style={{ width: LEFT_PANEL_W, flexShrink: 0, borderRight: '1px solid #222', background: '#111' }}>
          <div style={{ height: HEADER_HEIGHT, borderBottom: '1px solid #222', padding: '0 12px', display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 13 }}>
            Task Name
          </div>
          {tasks.map((t, _idx) => (
            <div key={t.id || (t as any)._id || _idx} style={{ height: ROW_HEIGHT, borderBottom: '1px solid #1a1a1a', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 12, gap: 6 }}>
              {t.milestone ? <Diamond size={12} color="#e91e63" /> : <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
            </div>
          ))}
        </div>

        {/* Right panel: SVG chart */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', background: '#0d0d0d' }}>
          <svg ref={svgRef} width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#939393" />
              </marker>
            </defs>
            {/* Header background */}
            <rect x={0} y={0} width={chartWidth} height={HEADER_HEIGHT} fill="#111" />
            {/* Grid + time labels */}
            {renderTimeHeader()}
            {/* Row separators */}
            {tasks.map((_, idx) => (
              <line key={`row-${idx}`} x1={0} y1={HEADER_HEIGHT + idx * ROW_HEIGHT} x2={chartWidth} y2={HEADER_HEIGHT + idx * ROW_HEIGHT} stroke="rgba(255,255,255,0.04)" />
            ))}
            {/* Dependency arrows */}
            {renderLinks()}
            {/* Task bars */}
            {renderTasks()}
          </svg>
        </div>
      </div>

      <div style={{ marginTop: 12, color: '#939393', fontSize: 12, display: 'flex', gap: 20 }}>
        <span>Drag bars to move tasks. Drag right edge to resize. Click Critical Path to highlight longest chain.</span>
      </div>
    </div>
  );
};

export default InteractiveGantt;
