const fs   = require('fs');
const path = require('path');
const db   = require('../db');
const config = require('../config');
const storage = require('./storage');

const TEMP_DIR       = path.join(config.uploadsDir, 'temp');
const PHOTO_MAX_MS   = 30 * 24 * 60 * 60 * 1000;  // 30 dias
const APP_MAX_MS     = 180 * 24 * 60 * 60 * 1000; // 6 meses

function cleanTempPhotos() {
  if (!fs.existsSync(TEMP_DIR)) return;
  const now = Date.now();
  let removed = 0;
  try {
    fs.readdirSync(TEMP_DIR).forEach(fname => {
      const fpath = path.join(TEMP_DIR, fname);
      try {
        const stat = fs.statSync(fpath);
        if (now - stat.mtimeMs > PHOTO_MAX_MS) {
          fs.unlinkSync(fpath);
          removed++;
        }
      } catch {}
    });
  } catch {}
  if (removed) console.log(`[cleanup] ${removed} foto(s) temporária(s) removida(s)`);
}

async function cleanOldApplications() {
  const cutoff = new Date(Date.now() - APP_MAX_MS).toISOString().slice(0, 10);
  const old = db.prepare(
    'SELECT id, photos, thumb_url, pdf_url FROM applications WHERE created_at < ?'
  ).all(cutoff);
  if (!old.length) return;

  for (const app of old) {
    try {
      const urls = JSON.parse(app.photos || '[]');
      for (const u of urls) await storage.deleteFile(u);
    } catch {}
    try {
      await storage.deleteFile(app.thumb_url);
      await storage.deleteFile(app.pdf_url);
    } catch {}
    db.prepare('DELETE FROM applications WHERE id = ?').run(app.id);
  }
  console.log(`[cleanup] ${old.length} inscrição(ões) com mais de 6 meses removida(s)`);
}

async function runCleanup() {
  try { cleanTempPhotos(); } catch (e) { console.error('[cleanup] Erro fotos:', e.message); }
  try { await cleanOldApplications(); } catch (e) { console.error('[cleanup] Erro apps:', e.message); }
}

function startCleanupScheduler() {
  setTimeout(() => runCleanup().catch(e => console.error('[cleanup]', e.message)), 5 * 60 * 1000);
  setInterval(() => runCleanup().catch(e => console.error('[cleanup]', e.message)), 24 * 60 * 60 * 1000);
  console.log('[cleanup] Agendamento de limpeza automática ativado');
}

module.exports = { startCleanupScheduler, runCleanup };
