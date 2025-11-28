import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// QUALITY CHECKLISTS
// ============================================

// Get project quality checklists
router.get('/:projectId/quality-checklists', async (req, res) => {
  try {
    const { status, checklist_type } = req.query;
    let query = `
      SELECT qc.*, 
             u.name as completed_by_name,
             t.name as task_name
      FROM project_quality_checklists qc
      LEFT JOIN users u ON qc.completed_by = u.id
      LEFT JOIN project_tasks t ON qc.task_id = t.id
      WHERE qc.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND qc.status = $${paramCount++}`;
      params.push(status);
    }

    if (checklist_type) {
      query += ` AND qc.checklist_type = $${paramCount++}`;
      params.push(checklist_type);
    }

    query += ' ORDER BY qc.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quality checklists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create quality checklist
router.post('/:projectId/quality-checklists', async (req, res) => {
  try {
    const {
      task_id,
      checklist_name,
      checklist_type,
      items,
    } = req.body;

    if (!checklist_name || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Checklist name and items are required' });
    }

    const result = await pool.query(
      `INSERT INTO project_quality_checklists (
        project_id, task_id, checklist_name, checklist_type, items, status
      ) VALUES ($1, $2, $3, $4, $5, 'draft')
      RETURNING *`,
      [
        req.params.projectId,
        task_id,
        checklist_name,
        checklist_type || 'qa',
        JSON.stringify(items),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating quality checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update checklist items
router.put('/quality-checklists/:id', async (req, res) => {
  try {
    const { items, status, completed_by } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (items) {
      updateFields.push(`items = $${paramCount++}`);
      params.push(JSON.stringify(items));
    }

    if (status) {
      updateFields.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (completed_by) {
      updateFields.push(`completed_by = $${paramCount++}`);
      params.push(completed_by);
    }

    if (status === 'completed' && completed_by) {
      updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_quality_checklists SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// INSPECTION REPORTS
// ============================================

// Get project inspections
router.get('/:projectId/inspections', async (req, res) => {
  try {
    const { status, inspection_type } = req.query;
    let query = `
      SELECT i.*, 
             u1.name as inspector_name,
             u2.name as signed_off_by_name,
             t.name as task_name
      FROM project_inspections i
      LEFT JOIN users u1 ON i.inspector_id = u1.id
      LEFT JOIN users u2 ON i.signed_off_by = u2.id
      LEFT JOIN project_tasks t ON i.task_id = t.id
      WHERE i.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    if (inspection_type) {
      query += ` AND i.inspection_type = $${paramCount++}`;
      params.push(inspection_type);
    }

    query += ' ORDER BY i.inspection_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create inspection
router.post('/:projectId/inspections', async (req, res) => {
  try {
    const {
      task_id,
      inspection_type,
      inspection_date,
      inspector_id,
      findings,
      acceptance_criteria,
      sign_off_required,
    } = req.body;

    if (!inspection_type || !inspection_date || !inspector_id) {
      return res.status(400).json({ error: 'Inspection type, date, and inspector are required' });
    }

    const result = await pool.query(
      `INSERT INTO project_inspections (
        project_id, task_id, inspection_type, inspection_date, inspector_id,
        findings, acceptance_criteria, sign_off_required, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
      RETURNING *`,
      [
        req.params.projectId,
        task_id,
        inspection_type,
        inspection_date,
        inspector_id,
        findings,
        acceptance_criteria,
        sign_off_required || false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inspection
router.put('/inspections/:id', async (req, res) => {
  try {
    const {
      findings,
      non_conformities,
      corrective_actions,
      status,
      signed_off_by,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      findings,
      non_conformities,
      corrective_actions,
      status,
      signed_off_by,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (signed_off_by && status === 'completed') {
      updateFields.push(`signed_off_at = CURRENT_TIMESTAMP`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_inspections SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// COMPLIANCE TRACKING
// ============================================

// Get project compliance
router.get('/:projectId/compliance', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              ct.template_name,
              ct.compliance_standard
       FROM project_compliance c
       LEFT JOIN project_compliance_templates ct ON c.template_id = ct.id
       WHERE c.project_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create compliance tracking
router.post('/:projectId/compliance', async (req, res) => {
  try {
    const {
      template_id,
      compliance_status,
      last_audit_date,
      next_audit_date,
      audit_notes,
    } = req.body;

    if (!template_id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO project_compliance (
        project_id, template_id, compliance_status, last_audit_date, next_audit_date, audit_notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        req.params.projectId,
        template_id,
        compliance_status || 'not_started',
        last_audit_date,
        next_audit_date,
        audit_notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating compliance tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get compliance templates
router.get('/compliance-templates', async (req, res) => {
  try {
    const { compliance_standard, is_active } = req.query;
    let query = 'SELECT * FROM project_compliance_templates WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (compliance_standard) {
      query += ` AND compliance_standard = $${paramCount++}`;
      params.push(compliance_standard);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY template_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching compliance templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
