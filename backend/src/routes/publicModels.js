const router = require('express').Router();
const db = require('../db');

const PUBLIC_FIELDS = 'id, name, slug, category, categories, age, height, bust, waist, hips, shoes, eyes, hair, city, bio, featured, active, cover_image, cover_thumb, images, media, model_status, torax, terno, camisa, manequim, instagram, tiktok, youtube, home_order';

router.get('/', (req, res) => {
  const { category, featured, limit } = req.query;
  let query = `SELECT ${PUBLIC_FIELDS} FROM models WHERE active = 1`;
  const params = [];

  if (category) {
    query += ` AND (category = ? OR categories LIKE ?)`;
    params.push(category, `%"${category}"%`);
  }
  if (featured) { query += ' AND featured = 1'; }
  query += featured
    ? ' ORDER BY home_order ASC NULLS LAST, name ASC'
    : ' ORDER BY name ASC';
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
  const row = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM models WHERE slug = ? AND active = 1`).get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...row,
    images:     JSON.parse(row.images     || '[]'),
    media:      JSON.parse(row.media      || '[]'),
    categories: JSON.parse(row.categories || '[]'),
  });
});

module.exports = router;
