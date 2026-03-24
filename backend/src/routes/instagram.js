/**
 * Instagram via embed client-side — sem token, sem API
 * Backend apenas armazena URLs dos posts no banco.
 */
const router   = require('express').Router();
const db       = require('../db');
const adminAuth = require('../middleware/auth');

db.exec(`
  CREATE TABLE IF NOT EXISTS instagram_embeds (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT NOT NULL UNIQUE,
    image_url  TEXT,
    position   INTEGER DEFAULT 0,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);
try { db.prepare('ALTER TABLE instagram_embeds ADD COLUMN image_url TEXT').run(); } catch {}

// GET /api/instagram  — público
router.get('/', (req, res) => {
  const posts = db.prepare(
    'SELECT id, url, image_url, position FROM instagram_embeds WHERE active=1 ORDER BY position ASC, id DESC LIMIT 12'
  ).all();
  res.json(posts);
});

// POST /api/instagram  — admin
router.post('/', adminAuth, (req, res) => {
  const { url, image_url } = req.body || {};
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'URL inválida.' });
  }
  const clean = url.split('?')[0].replace(/\/$/, '') + '/';
  try {
    const row = db.prepare(
      'INSERT INTO instagram_embeds (url, image_url, position) VALUES (?, ?, (SELECT COALESCE(MAX(position),0)+1 FROM instagram_embeds))'
    ).run(clean, image_url || null);
    res.json({ id: row.lastInsertRowid, url: clean, image_url: image_url || null });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Post já adicionado.' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/instagram/:id  — admin
router.delete('/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM instagram_embeds WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/instagram/:id  — admin, reordenar
router.patch('/:id', adminAuth, (req, res) => {
  const { position } = req.body || {};
  db.prepare('UPDATE instagram_embeds SET position=? WHERE id=?').run(position, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
