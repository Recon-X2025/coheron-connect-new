import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// LIVE CHAT SESSIONS
// ============================================

// Get all chat sessions
router.get('/sessions', async (req, res) => {
  try {
    const { status, assigned_agent_id, channel } = req.query;
    let query = `
      SELECT cs.*, 
             p.name as partner_name,
             p.email as partner_email,
             u.name as agent_name,
             COUNT(DISTINCT cm.id) as message_count
      FROM chat_sessions cs
      LEFT JOIN partners p ON cs.partner_id = p.id
      LEFT JOIN support_agents sa ON cs.assigned_agent_id = sa.id
      LEFT JOIN users u ON sa.user_id = u.id
      LEFT JOIN chat_messages cm ON cs.session_id = cm.session_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND cs.status = $${paramCount++}`;
      params.push(status);
    }

    if (assigned_agent_id) {
      query += ` AND cs.assigned_agent_id = $${paramCount++}`;
      params.push(assigned_agent_id);
    }

    if (channel) {
      query += ` AND cs.channel = $${paramCount++}`;
      params.push(channel);
    }

    query += ' GROUP BY cs.id, p.name, p.email, u.name ORDER BY cs.created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat session by ID
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const sessionResult = await pool.query(
      `SELECT cs.*, 
              p.name as partner_name,
              p.email as partner_email,
              u.name as agent_name
       FROM chat_sessions cs
       LEFT JOIN partners p ON cs.partner_id = p.id
       LEFT JOIN support_agents sa ON cs.assigned_agent_id = sa.id
       LEFT JOIN users u ON sa.user_id = u.id
       WHERE cs.session_id = $1`,
      [req.params.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get messages
    const messagesResult = await pool.query(
      `SELECT cm.*, u.name as sender_name
       FROM chat_messages cm
       LEFT JOIN users u ON cm.sender_id = u.id
       WHERE cm.session_id = $1
       ORDER BY cm.created_at`,
      [req.params.sessionId]
    );

    res.json({
      ...sessionResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create chat session
router.post('/sessions', async (req, res) => {
  try {
    const { visitor_name, visitor_email, visitor_phone, partner_id, channel } = req.body;

    const sessionId = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.query(
      `INSERT INTO chat_sessions (session_id, visitor_name, visitor_email, visitor_phone, partner_id, channel)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [sessionId, visitor_name, visitor_email, visitor_phone, partner_id, channel || 'web']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { content, message_type, sender_id } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (session_id, message_type, content, sender_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.sessionId, message_type || 'user', content, sender_id]
    );

    // Update session status if needed
    await pool.query(
      `UPDATE chat_sessions SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE session_id = $1`,
      [req.params.sessionId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign agent to chat
router.post('/sessions/:sessionId/assign', async (req, res) => {
  try {
    const { assigned_agent_id } = req.body;

    if (!assigned_agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    const result = await pool.query(
      `UPDATE chat_sessions 
       SET assigned_agent_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2
       RETURNING *`,
      [assigned_agent_id, req.params.sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning agent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End chat session
router.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE chat_sessions 
       SET status = 'ended', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $1
       RETURNING *`,
      [req.params.sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error ending chat session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create ticket from chat
router.post('/sessions/:sessionId/create-ticket', async (req, res) => {
  try {
    const session = await pool.query('SELECT * FROM chat_sessions WHERE session_id = $1', [
      req.params.sessionId,
    ]);

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const { subject, description, priority, category_id } = req.body;
    const chatSession = session.rows[0];

    // Generate ticket number
    const ticketCount = await pool.query('SELECT COUNT(*) as count FROM support_tickets');
    const num = parseInt(ticketCount.rows[0]?.count || '0') + 1;
    const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

    const ticketResult = await pool.query(
      `INSERT INTO support_tickets (
        ticket_number, subject, description, priority, category_id,
        partner_id, channel_id, source, ticket_type
      ) VALUES ($1, $2, $3, $4, $5, $6, 
        (SELECT id FROM ticket_channels WHERE channel_type = 'chat' LIMIT 1),
        $7, 'issue')
      RETURNING *`,
      [
        ticketNumber,
        subject || `Chat: ${chatSession.visitor_name || 'Visitor'}`,
        description || 'Created from live chat session',
        priority || 'medium',
        category_id,
        chatSession.partner_id,
        `chat-${req.params.sessionId}`,
      ]
    );

    // Update chat session with ticket reference
    await pool.query('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = $1', [
      req.params.sessionId,
    ]);

    res.status(201).json(ticketResult.rows[0]);
  } catch (error) {
    console.error('Error creating ticket from chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

