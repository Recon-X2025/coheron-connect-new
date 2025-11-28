import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// WIKI PAGE TEMPLATES CRUD
// ============================================

// Get all templates
router.get('/wiki/templates', async (req, res) => {
  try {
    const { space_id, template_type, is_system } = req.query;
    let query = `
      SELECT t.*, 
             u.name as created_by_name,
             ks.name as space_name
      FROM kb_page_templates t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN knowledge_spaces ks ON t.space_id = ks.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (space_id) {
      query += ` AND (t.space_id = $${paramCount++} OR t.space_id IS NULL)`;
      params.push(space_id);
    }

    if (template_type) {
      query += ` AND t.template_type = $${paramCount++}`;
      params.push(template_type);
    }

    if (is_system !== undefined) {
      query += ` AND t.is_system = $${paramCount++}`;
      params.push(is_system === 'true');
    }

    query += ' ORDER BY t.is_system DESC, t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template by ID
router.get('/wiki/templates/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              u.name as created_by_name,
              ks.name as space_name
       FROM kb_page_templates t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN knowledge_spaces ks ON t.space_id = ks.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create template
router.post('/wiki/templates', async (req, res) => {
  try {
    const { space_id, name, description, template_content, template_type, is_system, created_by } =
      req.body;

    if (!name || !template_content) {
      return res.status(400).json({ error: 'Name and template_content are required' });
    }

    const result = await pool.query(
      `INSERT INTO kb_page_templates (
        space_id, name, description, template_content, template_type, is_system, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        space_id,
        name,
        description,
        template_content,
        template_type,
        is_system !== undefined ? is_system : false,
        created_by,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update template
router.put('/wiki/templates/:id', async (req, res) => {
  try {
    const { name, description, template_content, template_type, is_system } = req.body;

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
    if (template_content !== undefined) {
      updateFields.push(`template_content = $${paramCount++}`);
      params.push(template_content);
    }
    if (template_type !== undefined) {
      updateFields.push(`template_type = $${paramCount++}`);
      params.push(template_type);
    }
    if (is_system !== undefined) {
      updateFields.push(`is_system = $${paramCount++}`);
      params.push(is_system);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id);
    const query = `UPDATE kb_page_templates SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete template
router.delete('/wiki/templates/:id', async (req, res) => {
  try {
    // Check if template is system template
    const templateCheck = await pool.query(
      'SELECT is_system FROM kb_page_templates WHERE id = $1',
      [req.params.id]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (templateCheck.rows[0].is_system) {
      return res.status(400).json({ error: 'Cannot delete system template' });
    }

    const result = await pool.query('DELETE FROM kb_page_templates WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template types (for dropdowns)
router.get('/wiki/templates/types', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT template_type, COUNT(*) as count
       FROM kb_page_templates
       WHERE template_type IS NOT NULL
       GROUP BY template_type
       ORDER BY template_type`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching template types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

