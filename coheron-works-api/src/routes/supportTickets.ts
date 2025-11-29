import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SUPPORT TICKETS - CRUD Operations
// ============================================

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const { status, priority, assigned_agent_id, assigned_team_id, partner_id, ticket_type, search } = req.query;
    let query = `
      SELECT t.*, 
             p.name as partner_name,
             p.email as partner_email,
             a.user_id as agent_user_id,
             u1.name as agent_name,
             st.name as team_name,
             tc.name as channel_name,
             cat.name as category_name,
             sla.name as sla_policy_name,
             COUNT(DISTINCT tn.id) as note_count,
             COUNT(DISTINCT tw.user_id) as watcher_count
      FROM support_tickets t
      LEFT JOIN partners p ON t.partner_id = p.id
      LEFT JOIN support_agents a ON t.assigned_agent_id = a.id
      LEFT JOIN users u1 ON a.user_id = u1.id
      LEFT JOIN support_teams st ON t.assigned_team_id = st.id
      LEFT JOIN ticket_channels tc ON t.channel_id = tc.id
      LEFT JOIN ticket_categories cat ON t.category_id = cat.id
      LEFT JOIN sla_policies sla ON t.sla_policy_id = sla.id
      LEFT JOIN ticket_notes tn ON t.id = tn.ticket_id
      LEFT JOIN ticket_watchers tw ON t.id = tw.ticket_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND t.status = $${paramCount++}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND t.priority = $${paramCount++}`;
      params.push(priority);
    }

    if (assigned_agent_id) {
      query += ` AND t.assigned_agent_id = $${paramCount++}`;
      params.push(assigned_agent_id);
    }

    if (assigned_team_id) {
      query += ` AND t.assigned_team_id = $${paramCount++}`;
      params.push(assigned_team_id);
    }

    if (partner_id) {
      query += ` AND t.partner_id = $${paramCount++}`;
      params.push(partner_id);
    }

    if (ticket_type) {
      query += ` AND t.ticket_type = $${paramCount++}`;
      params.push(ticket_type);
    }

    if (search) {
      query += ` AND (t.subject ILIKE $${paramCount} OR t.description ILIKE $${paramCount} OR t.ticket_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' GROUP BY t.id, p.name, p.email, a.user_id, u1.name, st.name, tc.name, cat.name, sla.name ORDER BY t.created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ticket by ID with full details
router.get('/:id', async (req, res) => {
  try {
    // Get ticket details
    const ticketResult = await pool.query(
      `SELECT t.*, 
              p.name as partner_name,
              p.email as partner_email,
              a.user_id as agent_user_id,
              u1.name as agent_name,
              u1.email as agent_email,
              st.name as team_name,
              tc.name as channel_name,
              cat.name as category_name,
              sla.name as sla_policy_name
       FROM support_tickets t
       LEFT JOIN partners p ON t.partner_id = p.id
       LEFT JOIN support_agents a ON t.assigned_agent_id = a.id
       LEFT JOIN users u1 ON a.user_id = u1.id
       LEFT JOIN support_teams st ON t.assigned_team_id = st.id
       LEFT JOIN ticket_channels tc ON t.channel_id = tc.id
       LEFT JOIN ticket_categories cat ON t.category_id = cat.id
       LEFT JOIN sla_policies sla ON t.sla_policy_id = sla.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Get notes
    const notesResult = await pool.query(
      `SELECT tn.*, u.name as created_by_name
       FROM ticket_notes tn
       LEFT JOIN users u ON tn.created_by = u.id
       WHERE tn.ticket_id = $1
       ORDER BY tn.created_at`,
      [req.params.id]
    );

    // Get attachments
    const attachmentsResult = await pool.query(
      `SELECT ta.*, u.name as uploaded_by_name
       FROM ticket_attachments ta
       LEFT JOIN users u ON ta.uploaded_by = u.id
       WHERE ta.ticket_id = $1
       ORDER BY ta.created_at`,
      [req.params.id]
    );

    // Get watchers
    const watchersResult = await pool.query(
      `SELECT tw.*, u.name as user_name, u.email as user_email
       FROM ticket_watchers tw
       LEFT JOIN users u ON tw.user_id = u.id
       WHERE tw.ticket_id = $1`,
      [req.params.id]
    );

    // Get history
    const historyResult = await pool.query(
      `SELECT th.*, u.name as performed_by_name
       FROM ticket_history th
       LEFT JOIN users u ON th.performed_by = u.id
       WHERE th.ticket_id = $1
       ORDER BY th.created_at DESC`,
      [req.params.id]
    );

    // Get child tickets
    const childrenResult = await pool.query(
      'SELECT * FROM support_tickets WHERE parent_ticket_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({
      ...ticket,
      notes: notesResult.rows,
      attachments: attachmentsResult.rows,
      watchers: watchersResult.rows,
      history: historyResult.rows,
      children: childrenResult.rows,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create ticket
router.post('/', async (req, res) => {
  try {
    const {
      subject,
      description,
      ticket_type,
      priority,
      channel_id,
      category_id,
      partner_id,
      contact_id,
      assigned_team_id,
      source,
      tags,
      custom_fields,
      is_public,
    } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    // Generate ticket number
    const ticketCount = await pool.query('SELECT COUNT(*) as count FROM support_tickets');
    const num = parseInt(ticketCount.rows[0]?.count || '0') + 1;
    const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

    // Auto-assign SLA based on priority
    let slaPolicyId = null;
    if (priority) {
      const slaResult = await pool.query(
        'SELECT id FROM sla_policies WHERE priority = $1 AND is_active = true LIMIT 1',
        [priority]
      );
      if (slaResult.rows.length > 0) {
        slaPolicyId = slaResult.rows[0].id;
      }
    }

    // Calculate SLA deadlines if SLA policy exists
    let firstResponseDeadline = null;
    let resolutionDeadline = null;
    if (slaPolicyId) {
      const slaPolicy = await pool.query('SELECT * FROM sla_policies WHERE id = $1', [slaPolicyId]);
      if (slaPolicy.rows.length > 0) {
        const policy = slaPolicy.rows[0];
        const now = new Date();
        firstResponseDeadline = new Date(now.getTime() + policy.first_response_time_minutes * 60000);
        resolutionDeadline = new Date(now.getTime() + policy.resolution_time_minutes * 60000);
      }
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (
        ticket_number, subject, description, ticket_type, priority,
        channel_id, category_id, partner_id, contact_id, assigned_team_id,
        sla_policy_id, source, tags, custom_fields, is_public,
        sla_first_response_deadline, sla_resolution_deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        ticketNumber,
        subject,
        description,
        ticket_type || 'issue',
        priority || 'medium',
        channel_id || null,
        category_id || null,
        partner_id || null,
        contact_id || null,
        assigned_team_id || null,
        slaPolicyId || null,
        source || null,
        tags && Array.isArray(tags) ? tags : (tags ? [tags] : []),
        custom_fields || null,
        is_public !== undefined ? is_public : true,
        firstResponseDeadline || null,
        resolutionDeadline || null,
      ]
    );

    // Log history
    await pool.query(
      `INSERT INTO ticket_history (ticket_id, action, new_value, performed_by)
       VALUES ($1, 'created', $2, $3)`,
      [result.rows[0].id, 'Ticket created', ticketNumber, req.body.created_by || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ticket
router.put('/:id', async (req, res) => {
  try {
    const {
      subject,
      description,
      ticket_type,
      status,
      priority,
      channel_id,
      category_id,
      assigned_agent_id,
      assigned_team_id,
      tags,
      custom_fields,
    } = req.body;

    // Get current ticket
    const currentTicket = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [
      req.params.id,
    ]);

    if (currentTicket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldTicket = currentTicket.rows[0];

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      subject,
      description,
      ticket_type,
      status,
      priority,
      channel_id,
      category_id,
      assigned_agent_id,
      assigned_team_id,
      tags,
      custom_fields,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    // Handle status changes
    if (status === 'in_progress' && oldTicket.status !== 'in_progress') {
      updateFields.push(`first_response_at = CURRENT_TIMESTAMP`);
      if (assigned_agent_id) {
        updateFields.push(`first_response_by = $${paramCount++}`);
        params.push(assigned_agent_id);
      }
    }

    if (status === 'resolved' && oldTicket.status !== 'resolved') {
      updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
      if (assigned_agent_id) {
        updateFields.push(`resolved_by = $${paramCount++}`);
        params.push(assigned_agent_id);
      }
    }

    if (status === 'closed' && oldTicket.status !== 'closed') {
      updateFields.push(`closed_at = CURRENT_TIMESTAMP`);
      if (assigned_agent_id) {
        updateFields.push(`closed_by = $${paramCount++}`);
        params.push(assigned_agent_id);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    // Log history for changes
    if (status && status !== oldTicket.status) {
      await pool.query(
        `INSERT INTO ticket_history (ticket_id, action, old_value, new_value, performed_by)
         VALUES ($1, 'status_changed', $2, $3, $4)`,
        [req.params.id, oldTicket.status, status, req.body.updated_by || null]
      );
    }

    if (priority && priority !== oldTicket.priority) {
      await pool.query(
        `INSERT INTO ticket_history (ticket_id, action, old_value, new_value, performed_by)
         VALUES ($1, 'priority_changed', $2, $3, $4)`,
        [req.params.id, oldTicket.priority, priority, req.body.updated_by || null]
      );
    }

    if (assigned_agent_id && assigned_agent_id !== oldTicket.assigned_agent_id) {
      await pool.query(
        `INSERT INTO ticket_history (ticket_id, action, old_value, new_value, performed_by)
         VALUES ($1, 'assigned', $2, $3, $4)`,
        [req.params.id, oldTicket.assigned_agent_id, assigned_agent_id, req.body.updated_by || null]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete ticket
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM support_tickets WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TICKET ACTIONS
// ============================================

// Merge tickets
router.post('/:id/merge', async (req, res) => {
  try {
    const { merge_into_ticket_id } = req.body;

    if (!merge_into_ticket_id) {
      return res.status(400).json({ error: 'Target ticket ID is required' });
    }

    // Update the ticket to be merged
    await pool.query(
      `UPDATE support_tickets 
       SET merged_from_ticket_id = $1, status = 'closed'
       WHERE id = $2
       RETURNING *`,
      [merge_into_ticket_id, req.params.id]
    );

    // Add note to target ticket
    await pool.query(
      `INSERT INTO ticket_notes (ticket_id, note_type, content, created_by)
       VALUES ($1, 'internal', $2, $3)`,
      [
        merge_into_ticket_id,
        `Ticket ${req.params.id} was merged into this ticket`,
        req.body.merged_by || null,
      ]
    );

    res.json({ message: 'Tickets merged successfully' });
  } catch (error) {
    console.error('Error merging tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Split ticket
router.post('/:id/split', async (req, res) => {
  try {
    const { subjects, descriptions } = req.body;

    if (!subjects || !descriptions || subjects.length !== descriptions.length) {
      return res.status(400).json({ error: 'Subjects and descriptions arrays must match' });
    }

    const parentTicket = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [
      req.params.id,
    ]);

    if (parentTicket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const parent = parentTicket.rows[0];
    const childTickets = [];

    for (let i = 0; i < subjects.length; i++) {
      const ticketCount = await pool.query('SELECT COUNT(*) as count FROM support_tickets');
      const num = parseInt(ticketCount.rows[0]?.count || '0') + i + 1;
      const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

      const result = await pool.query(
        `INSERT INTO support_tickets (
          ticket_number, subject, description, ticket_type, priority,
          channel_id, category_id, partner_id, assigned_team_id,
          parent_ticket_id, sla_policy_id, tags, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          ticketNumber,
          subjects[i],
          descriptions[i],
          parent.ticket_type,
          parent.priority,
          parent.channel_id,
          parent.category_id,
          parent.partner_id,
          parent.assigned_team_id,
          parent.id,
          parent.sla_policy_id,
          parent.tags,
          parent.is_public,
        ]
      );

      childTickets.push(result.rows[0]);
    }

    res.status(201).json({ message: 'Ticket split successfully', child_tickets: childTickets });
  } catch (error) {
    console.error('Error splitting ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer ticket
router.post('/:id/transfer', async (req, res) => {
  try {
    const { assigned_team_id, assigned_agent_id, reason } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (assigned_team_id) {
      updateFields.push(`assigned_team_id = $${paramCount++}`);
      params.push(assigned_team_id);
    }

    if (assigned_agent_id !== undefined) {
      updateFields.push(`assigned_agent_id = $${paramCount++}`);
      params.push(assigned_agent_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Must specify team or agent to transfer to' });
    }

    params.push(req.params.id);
    const query = `UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Add note
    if (reason) {
      await pool.query(
        `INSERT INTO ticket_notes (ticket_id, note_type, content, created_by)
         VALUES ($1, 'internal', $2, $3)`,
        [req.params.id, `Ticket transferred. Reason: ${reason}`, req.body.transferred_by || null]
      );
    }

    // Log history
    await pool.query(
      `INSERT INTO ticket_history (ticket_id, action, new_value, performed_by)
       VALUES ($1, 'transferred', $2, $3)`,
      [
        req.params.id,
        `Transferred to team: ${assigned_team_id}, agent: ${assigned_agent_id}`,
        req.body.transferred_by || null,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error transferring ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TICKET NOTES
// ============================================

// Add note
router.post('/:id/notes', async (req, res) => {
  try {
    const { note_type, content, created_by, is_pinned } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const result = await pool.query(
      `INSERT INTO ticket_notes (ticket_id, note_type, content, created_by, is_pinned)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, note_type || 'public', content, created_by, is_pinned || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TICKET WATCHERS
// ============================================

// Add watcher
router.post('/:id/watchers', async (req, res) => {
  try {
    const { user_id } = req.body;

    const result = await pool.query(
      `INSERT INTO ticket_watchers (ticket_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (ticket_id, user_id) DO NOTHING
       RETURNING *`,
      [req.params.id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User is already watching this ticket' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding watcher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove watcher
router.delete('/:id/watchers/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ticket_watchers WHERE ticket_id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    res.json({ message: 'Watcher removed successfully' });
  } catch (error) {
    console.error('Error removing watcher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

