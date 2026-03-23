const express = require('express');
const router = express.Router();
const db = require('../db');

function getAuth(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== 'andy-secret-token-fase1') {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

router.get('/music', (req, res) => {
  const enabled = db.prepare("SELECT value FROM settings WHERE key='music_enabled'").get();
  const url     = db.prepare("SELECT value FROM settings WHERE key='spotify_embed_url'").get();
  res.json({
    music_enabled: enabled ? enabled.value === '1' : false,
    spotify_embed_url: url ? url.value : '',
  });
});

router.put('/music', (req, res) => {
  if (!getAuth(req, res)) return;
  const { music_enabled, spotify_embed_url } = req.body;
  db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('music_enabled',?)").run(music_enabled ? '1' : '0');
  if (spotify_embed_url !== undefined) {
    db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('spotify_embed_url',?)").run(spotify_embed_url || '');
  }
  res.json({ ok: true });
});

module.exports = router;
