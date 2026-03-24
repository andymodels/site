/**
 * Instagram — extrai og:image, faz download local, serve via /uploads/instagram/
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/auth');
const https     = require('https');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');
const config    = require('../config');

const IG_DIR     = path.join(config.uploadsDir, 'instagram');
const IG_URL_BASE = `${config.uploadsUrl}/instagram`;
fs.mkdirSync(IG_DIR, { recursive: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS instagram_embeds (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    url         TEXT NOT NULL UNIQUE,
    image_url   TEXT,
    local_file  TEXT,
    position    INTEGER DEFAULT 0,
    active      INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);
try { db.prepare('ALTER TABLE instagram_embeds ADD COLUMN image_url  TEXT').run(); } catch {}
try { db.prepare('ALTER TABLE instagram_embeds ADD COLUMN local_file TEXT').run(); } catch {}

// ── helpers ────────────────────────────────────────────────────────────────

function fetchText(url, maxBytes = 80000, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };

    const timer = setTimeout(() => { req.destroy(); done(''); }, timeoutMs);

    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      if ([301,302,307,308].includes(res.statusCode) && res.headers.location) {
        clearTimeout(timer);
        return fetchText(res.headers.location, maxBytes, timeoutMs).then(done);
      }
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > maxBytes) req.destroy(); });
      res.on('end', () => { clearTimeout(timer); done(body); });
    });
    req.on('error', () => { clearTimeout(timer); done(''); });
    req.on('timeout', () => { req.destroy(); done(''); });
  });
}

function downloadFile(url, destPath, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    let settled = false;
    const fail  = (e) => { if (!settled) { settled = true; reject(e); } };
    const ok    = ()  => { if (!settled) { settled = true; resolve(); } };

    const timer = setTimeout(() => { req.destroy(); fail(new Error('timeout')); }, timeoutMs);

    const req = lib.get(url, (res) => {
      if ([301,302,307,308].includes(res.statusCode) && res.headers.location) {
        clearTimeout(timer);
        return downloadFile(res.headers.location, destPath, timeoutMs).then(ok).catch(fail);
      }
      if (res.statusCode !== 200) { clearTimeout(timer); return fail(new Error(`HTTP ${res.statusCode}`)); }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => { clearTimeout(timer); ok(); });
      stream.on('error',  (e) => { clearTimeout(timer); fail(e); });
    });
    req.on('error',   (e) => { clearTimeout(timer); fail(e); });
    req.on('timeout', ()  => { req.destroy(); fail(new Error('timeout')); });
  });
}

async function extractAndDownload(postUrl) {
  console.log(`[instagram] buscando og:image para: ${postUrl}`);
  const html = await fetchText(postUrl);

  if (!html) {
    console.warn('[instagram] Instagram bloqueou ou timeout na requisição de página.');
    return { image_url: null, local_file: null, blocked: true };
  }

  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
             || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

  if (!match) {
    console.warn('[instagram] og:image não encontrado no HTML.');
    return { image_url: null, local_file: null, blocked: false };
  }

  const ogImage = match[1].replace(/&amp;/g, '&');
  console.log(`[instagram] og:image encontrado: ${ogImage.slice(0, 80)}...`);

  const ext   = ogImage.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const fname = `ig_${Date.now()}.${ext}`;
  const fpath = path.join(IG_DIR, fname);

  try {
    await downloadFile(ogImage, fpath);
    console.log(`[instagram] imagem salva: ${fname}`);
    return { image_url: `${IG_URL_BASE}/${fname}`, local_file: fname, blocked: false };
  } catch (e) {
    console.error(`[instagram] falha no download da imagem: ${e.message}`);
    try { fs.unlinkSync(fpath); } catch {}
    return { image_url: null, local_file: null, blocked: false };
  }
}

function deleteLocalFile(fname) {
  if (!fname) return;
  try { fs.unlinkSync(path.join(IG_DIR, fname)); } catch {}
}

function cleanOrphanFiles() {
  const files = fs.readdirSync(IG_DIR).filter(f => f.startsWith('ig_'));
  const used  = new Set(
    db.prepare('SELECT local_file FROM instagram_embeds WHERE local_file IS NOT NULL').all()
      .map(r => r.local_file)
  );
  let removed = 0;
  for (const f of files) {
    if (!used.has(f)) { fs.unlinkSync(path.join(IG_DIR, f)); removed++; }
  }
  if (removed > 0) console.log(`[instagram] limpeza: ${removed} arquivo(s) órfão(s) removidos.`);
}

// Limpeza ao iniciar e depois a cada 6h
cleanOrphanFiles();
setInterval(cleanOrphanFiles, 6 * 60 * 60 * 1000);

// ── Rotas ──────────────────────────────────────────────────────────────────

// GET /api/instagram  — público
router.get('/', (req, res) => {
  const posts = db.prepare(
    'SELECT id, url, image_url, position FROM instagram_embeds WHERE active=1 ORDER BY position ASC, id DESC LIMIT 12'
  ).all();
  res.json(posts);
});

// POST /api/instagram  — admin
router.post('/', adminAuth, async (req, res) => {
  const { url, image_url: manualImage } = req.body || {};
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'URL inválida.' });
  }
  const clean = url.split('?')[0].replace(/\/$/, '') + '/';

  // Tenta extração automática; se falhar, salva mesmo assim
  let image_url = manualImage || null;
  let local_file = null;
  let warning = null;

  if (!manualImage) {
    try {
      const result = await extractAndDownload(clean);
      image_url  = result.image_url;
      local_file = result.local_file;
      if (result.blocked || !result.image_url) {
        warning = 'Post salvo sem imagem (Instagram bloqueou a extração automática). Adicione a URL da imagem manualmente se necessário.';
      }
    } catch (e) {
      console.error('[instagram] erro inesperado:', e.message);
      warning = 'Post salvo sem imagem.';
    }
  }

  try {
    const row = db.prepare(
      'INSERT INTO instagram_embeds (url, image_url, local_file, position) VALUES (?, ?, ?, (SELECT COALESCE(MAX(position),0)+1 FROM instagram_embeds))'
    ).run(clean, image_url, local_file);
    res.json({ id: row.lastInsertRowid, url: clean, image_url, warning });
  } catch (e) {
    deleteLocalFile(local_file);
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Post já adicionado.' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/instagram/:id  — admin
router.delete('/:id', adminAuth, (req, res) => {
  const row = db.prepare('SELECT local_file FROM instagram_embeds WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM instagram_embeds WHERE id=?').run(req.params.id);
  if (row?.local_file) deleteLocalFile(row.local_file);
  res.json({ ok: true });
});

// PATCH /api/instagram/:id  — reordenar ou atualizar image_url manual
router.patch('/:id', adminAuth, (req, res) => {
  const { position, image_url } = req.body || {};
  if (image_url !== undefined) {
    db.prepare('UPDATE instagram_embeds SET image_url=? WHERE id=?').run(image_url || null, req.params.id);
  }
  if (position !== undefined) {
    db.prepare('UPDATE instagram_embeds SET position=? WHERE id=?').run(position, req.params.id);
  }
  res.json({ ok: true });
});

module.exports = router;
