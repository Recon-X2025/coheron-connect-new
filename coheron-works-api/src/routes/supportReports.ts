import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SUPPORT DESK REPORTS & ANALYTICS
// ============================================

// Dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (start_date && end_date) {
      dateFilter = 'WHERE t.created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }

    // Total tickets
    const totalTickets = await pool.query(
      `SELECT COUNT(*) as count FROM support_tickets t ${dateFilter}`,
      params
    );

    // Tickets by status
    const ticketsByStatus = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM support_tickets t 
       ${dateFilter}
       GROUP BY status`,
      params
    );

    // Tickets by priority
    const ticketsByPriority = await pool.query(
      `SELECT priority, COUNT(*) as count 
       FROM support_tickets t 
       ${dateFilter}
       GROUP BY priority`,
      params
    );

    // Tickets by channel
    const ticketsByChannel = await pool.query(
      `SELECT tc.name as channel_name, COUNT(*) as count 
       FROM support_tickets t
       LEFT JOIN ticket_channels tc ON t.channel_id = tc.id
       ${dateFilter}
       GROUP BY tc.name`,
      params
    );

    // SLA metrics
    const slaMetrics = await pool.query(
      `SELECT 
         COUNT(*) as total_tickets,
         COUNT(CASE WHEN is_sla_breached = true THEN 1 END) as breached_count,
         COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_deadline THEN 1 END) as met_count
       FROM support_tickets t
       ${dateFilter}`,
      params
    );

    // Average response time
    const avgResponseTime = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_minutes
       FROM support_tickets t
       WHERE first_response_at IS NOT NULL ${dateFilter ? `AND ${dateFilter.replace('WHERE', '')}` : ''}`,
      params
    );

    // Average resolution time
    const avgResolutionTime = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_minutes
       FROM support_tickets t
       WHERE resolved_at IS NOT NULL ${dateFilter ? `AND ${dateFilter.replace('WHERE', '')}` : ''}`,
      params
    );

    res.json({
      total_tickets: parseInt(totalTickets.rows[0]?.count || '0'),
      tickets_by_status: ticketsByStatus.rows,
      tickets_by_priority: ticketsByPriority.rows,
      tickets_by_channel: ticketsByChannel.rows,
      sla_metrics: {
        ...slaMetrics.rows[0],
        breach_rate:
          slaMetrics.rows[0]?.total_tickets > 0
            ? (slaMetrics.rows[0]?.breached_count / slaMetrics.rows[0]?.total_tickets) * 100
            : 0,
      },
      avg_response_time_minutes: parseFloat(avgResponseTime.rows[0]?.avg_minutes || '0'),
      avg_resolution_time_minutes: parseFloat(avgResolutionTime.rows[0]?.avg_minutes || '0'),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Agent performance report
router.get('/agents/performance', async (req, res) => {
  try {
    const { start_date, end_date, agent_id } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    let paramCount = 1;

    if (start_date && end_date) {
      dateFilter = `AND t.created_at BETWEEN $${paramCount++} AND $${paramCount++}`;
      params.push(start_date, end_date);
    }

    if (agent_id) {
      dateFilter += ` AND t.assigned_agent_id = $${paramCount++}`;
      params.push(agent_id);
    }

    const result = await pool.query(
      `SELECT 
         sa.id as agent_id,
         u.name as agent_name,
         COUNT(DISTINCT t.id) as tickets_assigned,
         COUNT(DISTINCT CASE WHEN t.status = 'resolved' THEN t.id END) as tickets_resolved,
         COUNT(DISTINCT CASE WHEN t.status = 'closed' THEN t.id END) as tickets_closed,
         AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 60) as avg_first_response_minutes,
         AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60) as avg_resolution_minutes,
         COUNT(DISTINCT CASE WHEN t.is_sla_breached = false AND t.resolved_at IS NOT NULL THEN t.id END) as sla_met_count,
         COUNT(DISTINCT CASE WHEN t.is_sla_breached = true THEN t.id END) as sla_breached_count
       FROM support_agents sa
       LEFT JOIN users u ON sa.user_id = u.id
       LEFT JOIN support_tickets t ON sa.id = t.assigned_agent_id ${dateFilter}
       WHERE sa.is_active = true
       GROUP BY sa.id, u.name
       ORDER BY tickets_resolved DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ticket volume trends
router.get('/tickets/trends', async (req, res) => {
  try {
    const { period = 'day', start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (start_date && end_date) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }

    let groupBy = '';
    if (period === 'day') {
      groupBy = "DATE_TRUNC('day', created_at)";
    } else if (period === 'week') {
      groupBy = "DATE_TRUNC('week', created_at)";
    } else if (period === 'month') {
      groupBy = "DATE_TRUNC('month', created_at)";
    }

    const result = await pool.query(
      `SELECT 
         ${groupBy} as period,
         COUNT(*) as ticket_count,
         COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
         COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
       FROM support_tickets
       ${dateFilter}
       GROUP BY ${groupBy}
       ORDER BY period`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ticket trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Category-wise tickets
router.get('/tickets/by-category', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (start_date && end_date) {
      dateFilter = 'AND t.created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }

    const result = await pool.query(
      `SELECT 
         tc.id as category_id,
         tc.name as category_name,
         COUNT(*) as ticket_count,
         AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60) as avg_resolution_minutes
       FROM support_tickets t
       LEFT JOIN ticket_categories tc ON t.category_id = tc.id
       WHERE 1=1 ${dateFilter}
       GROUP BY tc.id, tc.name
       ORDER BY ticket_count DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching category-wise tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Backlog aging report
router.get('/tickets/backlog-aging', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         id,
         ticket_number,
         subject,
         status,
         priority,
         created_at,
         EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 86400 as age_days,
         assigned_agent_id,
         assigned_team_id
       FROM support_tickets
       WHERE status NOT IN ('resolved', 'closed', 'cancelled')
       ORDER BY created_at ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching backlog aging:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer satisfaction trends
router.get('/surveys/satisfaction-trends', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (start_date && end_date) {
      dateFilter = 'WHERE sr.submitted_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }

    const result = await pool.query(
      `SELECT 
         DATE_TRUNC('month', sr.submitted_at) as month,
         AVG(sr.score) as avg_score,
         COUNT(*) as response_count
       FROM survey_responses sr
       ${dateFilter}
       WHERE sr.score IS NOT NULL
       GROUP BY DATE_TRUNC('month', sr.submitted_at)
       ORDER BY month`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching satisfaction trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Top recurring issues
router.get('/tickets/recurring-issues', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT 
         subject,
         category_id,
         COUNT(*) as occurrence_count,
         COUNT(DISTINCT partner_id) as affected_customers
       FROM support_tickets
       GROUP BY subject, category_id
       HAVING COUNT(*) > 1
       ORDER BY occurrence_count DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recurring issues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

