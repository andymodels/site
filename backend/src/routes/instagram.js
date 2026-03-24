/**
 * Instagram — backend armazena URLs + imagem extraída automaticamente (og:image)
 * Frontend exibe como grid limpa sem embed.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/auth');
const https     = require('https');

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

// Extrai og:image de uma URL do Instagram
function fetchOgImage(postUrl) {
  return new Promise((resolve) => {
    const urlObj = new URL(postUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    };
    const req = https.get(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > 80000) req.destroy(); });
      res.on('end', () => {
        const match = body.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                   || body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        resolve(match ? match[1] : null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// GET /api/instagram  — público
router.get('/', (req, res) => {
  const posts = db.prepare(
    'SELECT id, url, image_url, position FROM instagram_embeds WHERE active=1 ORDER BY position ASC, id DESC LIMIT 12'
  ).all();
  res.json(posts);
});

// POST /api/instagram  — admin: só precisa da URL do post
router.post('/', adminAuth, async (req, res) => {
  const { url } = req.body || {};
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'URL inválida.' });
  }
  const clean = url.split('?')[0].replace(/\/$/, '') + '/';

  // Extrai imagem automaticamente
  let image_url = null;
  try { image_url = await fetchOgImage(clean); } catch {}

  try {
    const row = db.prepare(
      'INSERT INTO instagram_embeds (url, image_url, position) VALUES (?, ?, (SELECT COALESCE(MAX(position),0)+1 FROM instagram_embeds))'
    ).run(clean, image_url);
    res.json({ id: row.lastInsertRowid, url: clean, image_url });
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
