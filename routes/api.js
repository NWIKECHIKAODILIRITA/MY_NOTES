const express = require('express');
const { pool } = require('../database');
const router = express.Router();

// Get all notes with category info
router.get('/notes', async (req, res) => {
  try {
    const { search, category, tag } = req.query;
    let query = `
      SELECT n.*, c.name as category_name, c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (n.title ILIKE $${params.length} OR n.content ILIKE $${params.length})`;
    }
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND n.category_id = $${params.length}`;
    }
    if (tag) {
      params.push(tag);
      query += ` AND $${params.length} = ANY(n.tags)`;
    }

    query += ` ORDER BY n.pinned DESC, n.updated_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get single note
router.get('/notes/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, c.name as category_name, c.color as category_color
       FROM notes n LEFT JOIN categories c ON n.category_id = c.id
       WHERE n.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Create note
router.post('/notes', async (req, res) => {
  try {
    const { title, content = '', category_id, tags = [], pinned = false, color = '#ffffff' } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const result = await pool.query(
      `INSERT INTO notes (title, content, category_id, tags, pinned, color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, content, category_id, tags, pinned, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to create note' });
  }
});

// Update note
router.put('/notes/:id', async (req, res) => {
  try {
    const { title, content, category_id, tags, pinned, color } = req.body;
    const result = await pool.query(
      `UPDATE notes
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           category_id = $3,
           tags = COALESCE($4, tags),
           pinned = COALESCE($5, pinned),
           color = COALESCE($6, color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [title, content, category_id, tags, pinned, color, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to update note' });
  }
});

// Toggle pin
router.patch('/notes/:id/pin', async (req, res) => {
  try {
    const { pinned } = req.body;
    const result = await pool.query(
      `UPDATE notes SET pinned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [pinned, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/notes/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(n.id) as note_count
       FROM categories c
       LEFT JOIN notes n ON n.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, color = '#6366f1' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const result = await pool.query(
      `INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING *`,
      [name, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;