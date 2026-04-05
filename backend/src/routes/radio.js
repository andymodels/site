const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const config  = require('../config');

// Ensure music dir exists
const musicDir = path.join(config.uploadsDir, 'music');
if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

// Create tracks table
db.exec(`
  CREATE TABLE IF NOT EXISTS radio_tracks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    filename   TEXT NOT NULL,
    position   INTEGER DEFAULT 0,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, musicDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|ogg|wav|aac|flac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio são aceitos'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

function auth(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== config.adminSecret) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  return true;
}

// Public: list active tracks
router.get('/', (req, res) => {
  const tracks = db.prepare(
    'SELECT id, title, filename, position FROM radio_tracks WHERE active=1 ORDER BY position, id'
  ).all().map(t => ({ ...t, url: `/uploads/music/${t.filename}` }));
  res.json(tracks);
});

// Admin: list all tracks (with optional pagination)
router.get('/admin', (req, res) => {
  if (!auth(req, res)) return;
  const limit  = parseInt(req.query.limit)  || 0;  // 0 = no limit
  const page   = parseInt(req.query.page)   || 1;
  const offset = limit ? (page - 1) * limit : 0;
  const total  = db.prepare('SELECT COUNT(*) as c FROM radio_tracks').get().c;
  const query  = limit
    ? 'SELECT * FROM radio_tracks ORDER BY position, id LIMIT ? OFFSET ?'
    : 'SELECT * FROM radio_tracks ORDER BY position, id';
  const rows   = limit
    ? db.prepare(query).all(limit, offset)
    : db.prepare(query).all();
  const tracks = rows.map(t => ({ ...t, url: `/uploads/music/${t.filename}` }));
  res.json({ tracks, total, page, pages: limit ? Math.ceil(total / limit) : 1 });
});

// Admin: upload track
router.post('/', upload.single('file'), (req, res) => {
  if (!auth(req, res)) return;
  if (!req.file) return res.status(400).json({ error: 'Arquivo necessário' });
  const title = req.body.title || req.file.originalname.replace(/\.[^.]+$/, '');
  const maxPos = db.prepare('SELECT MAX(position) as m FROM radio_tracks').get().m || 0;
  const result = db.prepare(
    'INSERT INTO radio_tracks(title, filename, position) VALUES(?,?,?)'
  ).run(title, req.file.filename, maxPos + 1);
  res.json({ id: result.lastInsertRowid, title, filename: req.file.filename, url: `/uploads/music/${req.file.filename}` });
});

// Admin: update title / active / position
router.put('/:id', (req, res) => {
  if (!auth(req, res)) return;
  const { title, active, position } = req.body;
  const track = db.prepare('SELECT * FROM radio_tracks WHERE id=?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  db.prepare('UPDATE radio_tracks SET title=?, active=?, position=? WHERE id=?').run(
    title ?? track.title,
    active !== undefined ? (active ? 1 : 0) : track.active,
    position ?? track.position,
    req.params.id,
  );
  res.json({ ok: true });
});

// Admin: delete track
router.delete('/:id', (req, res) => {
  if (!auth(req, res)) return;
  const track = db.prepare('SELECT * FROM radio_tracks WHERE id=?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  const filePath = path.join(musicDir, track.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM radio_tracks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
