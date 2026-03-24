/**
 * Instagram via embed client-side — sem token, sem API
 * Backend apenas armazena URLs dos posts no banco.
 * Frontend renderiza com o script oficial do Instagram.
 */
const router = require('express').Router();
const db     = require('../db');

// Garantir tabela de posts do Instagram
db.exec(`
  CREATE TABLE IF NOT EXISTS instagram_embeds (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT NOT NULL UNIQUE,
    position   INTEGER DEFAULT 0,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// GET /api/instagram — retorna lista de URLs para embed
router.get('/', (req, res) => {
  const posts = db.prepare(
    'SELECT id, url, position FROM instagram_embeds WHERE active = 1 ORDER BY position ASC, id DESC LIMIT 12'
  ).all();
  res.json(posts);
});

// POST /api/admin/instagram — adicionar post (admin)
router.post('/admin', (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'URL inválida. Cole o link de um post do Instagram.' });
  }
  // normalizar URL (remover query strings)
  const clean = url.split('?')[0].replace(/\/$/, '') + '/';
  try {
    const row = db.prepare(
      'INSERT INTO instagram_embeds (url, position) VALUES (?, (SELECT COALESCE(MAX(position),0)+1 FROM instagram_embeds))'
    ).run(clean);
    res.json({ id: row.lastInsertRowid, url: clean });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Post já adicionado.' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/instagram/:id — remover post (admin)
router.delete('/admin/:id', (req, res) => {
  db.prepare('DELETE FROM instagram_embeds WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/admin/instagram/:id — reordenar (admin)
router.patch('/admin/:id', (req, res) => {
  const { position } = req.body;
  db.prepare('UPDATE instagram_embeds SET position = ? WHERE id = ?').run(position, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
