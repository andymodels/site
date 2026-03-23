const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { category, featured, limit } = req.query;
  let query = 'SELECT * FROM models WHERE active = 1';
  const params = [];

  if (category) {
    query += ` AND (category = ? OR categories LIKE ?)`;
    params.push(category, `%"${category}"%`);
  }
  if (featured) { query += ' AND featured = 1'; }
  query += ' ORDER BY name ASC';
  if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit, 10)); }

  const rows = db.prepare(query).all(...params);
  res.json(rows.map(r => ({
    ...r,
    images:     JSON.parse(r.images     || '[]'),
    media:      JSON.parse(r.media      || '[]'),
    categories: JSON.parse(r.categories || '[]'),
  })));
});

router.get('/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM models WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...row,
    images:     JSON.parse(row.images     || '[]'),
    media:      JSON.parse(row.media      || '[]'),
    categories: JSON.parse(row.categories || '[]'),
  });
});

module.exports = router;
