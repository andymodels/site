const router = require('express').Router();
const db = require('../db');
const adminAuth = require('../middleware/auth');

// Public: get active home items
router.get('/', (req, res) => {
  const items = db.prepare(`
    SELECT h.*, m.name as model_name, m.slug as model_slug,
           m.cover_thumb, m.cover_image, m.category
    FROM home_items h
    LEFT JOIN models m ON h.model_id = m.id
    WHERE h.active = 1
    ORDER BY h.position ASC
  `).all();
  res.json(items);
});

// Admin CRUD
router.use(adminAuth);

router.post('/', (req, res) => {
  const { type, model_id, url, title, caption, position } = req.body;
  const r = db.prepare(`
    INSERT INTO home_items (type, model_id, url, title, caption, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type || 'model', model_id || null, url || null, title || null, caption || null, position || 0);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { type, model_id, url, title, caption, position, active } = req.body;
  db.prepare(`
    UPDATE home_items SET type=?, model_id=?, url=?, title=?, caption=?, position=?, active=? WHERE id=?
  `).run(type, model_id || null, url || null, title || null, caption || null, position || 0, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM home_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Reorder: [{id, position}]
router.post('/reorder', (req, res) => {
  const { items } = req.body;
  const stmt = db.prepare('UPDATE home_items SET position=? WHERE id=?');
  const run  = db.transaction(arr => arr.forEach(({ id, position }) => stmt.run(position, id)));
  run(items);
  res.json({ ok: true });
});

module.exports = router;
