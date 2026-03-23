const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function resolveDbPath() {
  const candidates = [
    process.env.DB_PATH,
    path.join(__dirname, '../../data/andy_models.db'),
    '/tmp/andy_models.db',
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.accessSync(path.dirname(p), fs.constants.W_OK);
      console.log('[db] Usando banco:', p);
      return p;
    } catch (e) {
      console.warn('[db] Ignorando path', p, '-', e.message);
    }
  }
  throw new Error('[db] Nenhum path de banco disponível');
}

const DB_PATH = resolveDbPath();
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'women',
    age INTEGER,
    height TEXT,
    bust TEXT,
    waist TEXT,
    hips TEXT,
    shoes TEXT,
    eyes TEXT,
    hair TEXT,
    city TEXT,
    bio TEXT,
    cover_image TEXT,
    images TEXT DEFAULT '[]',
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    age INTEGER,
    height TEXT,
    city TEXT,
    state TEXT,
    instagram TEXT,
    category TEXT DEFAULT 'women',
    photos TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

['state TEXT', 'instagram TEXT', 'photos TEXT DEFAULT \'[]\''].forEach(col => {
  try { db.exec(`ALTER TABLE applications ADD COLUMN ${col}`); } catch {}
});

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

['drive_folder_id TEXT', 'drive_synced_at TEXT', "sync_status TEXT DEFAULT 'active'", 'cover_thumb TEXT',
 'categories TEXT DEFAULT \'[]\'', 'media TEXT DEFAULT \'[]\'',
 'torax TEXT', 'terno TEXT', 'camisa TEXT', 'manequim TEXT'].forEach(col => {
  try { db.exec(`ALTER TABLE models ADD COLUMN ${col}`); } catch {}
});

db.exec(`
  CREATE TABLE IF NOT EXISTS home_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'model',
    model_id INTEGER,
    url TEXT,
    title TEXT,
    caption TEXT,
    position INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS instagram_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    embed_url TEXT NOT NULL,
    caption TEXT,
    position INTEGER DEFAULT 0,
    pinned INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.prepare(`
  UPDATE models
  SET categories = json_array(category)
  WHERE (categories IS NULL OR categories = '[]') AND category IS NOT NULL
`).run();

const modelsToMigrate = db.prepare(
  `SELECT id, cover_image, cover_thumb, images FROM models WHERE media IS NULL OR media = '[]'`
).all();

for (const m of modelsToMigrate) {
  try {
    const imgs = JSON.parse(m.images || '[]');
    const all  = m.cover_image ? [m.cover_image, ...imgs] : imgs;
    const media = all.map(url => ({
      type: 'image',
      url,
      thumb: url.includes('/full_') ? url.replace('/full_', '/thumb_') : null,
      polaroid: false,
    }));
    db.prepare('UPDATE models SET media = ? WHERE id = ?').run(JSON.stringify(media), m.id);
  } catch {}
}

module.exports = db;
