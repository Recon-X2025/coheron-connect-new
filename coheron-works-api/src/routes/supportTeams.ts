import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SUPPORT TEAMS
// ============================================

// Get all teams
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT st.*, 
              COUNT(DISTINCT sa.id) as agent_count,
              COUNT(DISTINCT t.id) as ticket_count
       FROM support_teams st
       LEFT JOIN support_agents sa ON st.id = sa.team_id
       LEFT JOIN support_tickets t ON st.id = t.assigned_team_id
       WHERE st.is_active = true
       GROUP BY st.id
       ORDER BY st.name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT st.*, 
              COUNT(DISTINCT sa.id) as agent_count
       FROM support_teams st
       LEFT JOIN support_agents sa ON st.id = sa.team_id
       WHERE st.id = $1
       GROUP BY st.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get agents in team
    const agentsResult = await pool.query(
      `SELECT sa.*, u.name as user_name, u.email as user_email
       FROM support_agents sa
       LEFT JOIN users u ON sa.user_id = u.id
       WHERE sa.team_id = $1 AND sa.is_active = true`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      agents: agentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create team
router.post('/', async (req, res) => {
  try {
    const { name, description, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const result = await pool.query(
      `INSERT INTO support_teams (name, description, email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, email]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const { name, description, email, is_active } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      params.push(email);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE support_teams SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SUPPORT AGENTS
// ============================================

// Get all agents
router.get('/agents/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.*, 
              u.name as user_name,
              u.email as user_email,
              st.name as team_name
       FROM support_agents sa
       LEFT JOIN users u ON sa.user_id = u.id
       LEFT JOIN support_teams st ON sa.team_id = st.id
       WHERE sa.is_active = true
       ORDER BY u.name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create agent
router.post('/agents', async (req, res) => {
  try {
    const { user_id, team_id, agent_type, max_tickets, skills } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO support_agents (user_id, team_id, agent_type, max_tickets, skills)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, team_id, agent_type || 'agent', max_tickets || 10, skills || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update agent
router.put('/agents/:id', async (req, res) => {
  try {
    const { team_id, agent_type, max_tickets, skills, is_active } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (team_id !== undefined) {
      updateFields.push(`team_id = $${paramCount++}`);
      params.push(team_id);
    }
    if (agent_type !== undefined) {
      updateFields.push(`agent_type = $${paramCount++}`);
      params.push(agent_type);
    }
    if (max_tickets !== undefined) {
      updateFields.push(`max_tickets = $${paramCount++}`);
      params.push(max_tickets);
    }
    if (skills !== undefined) {
      updateFields.push(`skills = $${paramCount++}`);
      params.push(skills);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE support_agents SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

