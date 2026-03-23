const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const FALLBACK_PATH = path.join(__dirname, '../../data/andy_models.db');

function resolveDbPath() {
  const requested = undefined;
  if (!requested) return FALLBACK_PATH;
  const dir = path.dirname(requested);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return requested;
  } catch (e) {
    console.warn(`[db] Sem permissão em ${dir}, usando fallback: ${FALLBACK_PATH}`);
    try { fs.mkdirSync(path.dirname(FALLBACK_PATH), { recursive: true }); } catch (_) {}
    return FALLBACK_PATH;
  }
}

const DB_PATH = resolveDbPath();
const db = new Database(DB_PATH);
console.log('[db] Banco de dados:', DB_PATH);

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

// migrate existing table if columns are missing
['state TEXT', 'instagram TEXT', 'photos TEXT DEFAULT \'[]\''].forEach(col => {
  try { db.exec(`ALTER TABLE applications ADD COLUMN ${col}`); } catch {}
});

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

// migrate models table
['drive_folder_id TEXT', 'drive_synced_at TEXT', "sync_status TEXT DEFAULT 'active'", 'cover_thumb TEXT',
 'categories TEXT DEFAULT \'[]\'', 'media TEXT DEFAULT \'[]\''].forEach(col => {
  try { db.exec(`ALTER TABLE models ADD COLUMN ${col}`); } catch {}
});

// home_items table
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

// instagram_posts table
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

// Data migrations (idempotent)
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
