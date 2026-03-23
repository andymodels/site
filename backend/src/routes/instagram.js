const db = require('../db');

const FIELDS      = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const LIMIT       = 12;
const CACHE_TTL   = 30 * 60 * 1000;          // 30 min feed cache
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // refresh token when < 7 days left

let feedCache  = null;
let cacheAt    = 0;

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value || null;
}
function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

function getToken()  { return getSetting('instagram_access_token') || process.env.INSTAGRAM_ACCESS_TOKEN; }
function getUserId() { return getSetting('instagram_user_id')      || process.env.INSTAGRAM_USER_ID; }

async function refreshTokenIfNeeded() {
  const expiresAt = parseInt(getSetting('instagram_token_expires_at') || '0', 10);
  const remaining = expiresAt - Date.now();
  if (remaining > REFRESH_TTL) return; // still has > 7 days — no need

  const token = getToken();
  if (!token) return;

  try {
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
    const res  = await fetch(url);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);

    setSetting('instagram_access_token', json.access_token);
    setSetting('instagram_token_expires_at', String(Date.now() + json.expires_in * 1000));
    console.log(`[instagram] Token renovado. Expira em ${Math.round(json.expires_in / 86400)} dias.`);
  } catch (e) {
    console.error('[instagram] Falha ao renovar token:', e.message);
  }
}

async function fetchFeed() {
  await refreshTokenIfNeeded();
  const token  = getToken();
  const userId = getUserId();
  if (!token || !userId) throw new Error('Instagram não configurado');

  const url = `https://graph.instagram.com/${userId}/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${token}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.data || [];
}

const router = require('express').Router();

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (!feedCache || now - cacheAt > CACHE_TTL) {
      feedCache = await fetchFeed();
      cacheAt   = now;
    }
    res.json(feedCache);
  } catch (e) {
    if (feedCache) return res.json(feedCache); // serve stale on error
    res.status(502).json({ error: e.message });
  }
});

// Status endpoint (admin use)
router.get('/status', (req, res) => {
  const expiresAt = parseInt(getSetting('instagram_token_expires_at') || '0', 10);
  const daysLeft  = Math.round((expiresAt - Date.now()) / 86400000);
  res.json({
    configured: Boolean(getToken()),
    token_days_left: daysLeft,
    cache_age_min: feedCache ? Math.round((Date.now() - cacheAt) / 60000) : null,
  });
});

// Force cache purge
router.delete('/cache', (_req, res) => {
  feedCache = null; cacheAt = 0;
  res.json({ ok: true });
});

// Run a check on startup
refreshTokenIfNeeded().catch(() => {});

module.exports = router;
