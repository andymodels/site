const fs   = require('fs');
const path = require('path');
const db   = require('../db');
const config = require('../config');

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

function cleanOldApplications() {
  const cutoff = new Date(Date.now() - APP_MAX_MS).toISOString().slice(0, 10);
  const old = db.prepare("SELECT id, photos FROM applications WHERE created_at < ?").all(cutoff);
  if (!old.length) return;

  for (const app of old) {
    // Remover fotos do disco antes de apagar o registro
    try {
      JSON.parse(app.photos || '[]').forEach(p => {
        const abs = path.join(__dirname, '../../../', p);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      });
    } catch {}
    db.prepare('DELETE FROM applications WHERE id = ?').run(app.id);
  }
  console.log(`[cleanup] ${old.length} inscrição(ões) com mais de 6 meses removida(s)`);
}

function runCleanup() {
  try { cleanTempPhotos(); }      catch (e) { console.error('[cleanup] Erro fotos:', e.message); }
  try { cleanOldApplications(); } catch (e) { console.error('[cleanup] Erro apps:',  e.message); }
}

function startCleanupScheduler() {
  // Rodar uma vez ao iniciar (horário aleatório para não sobrecarregar)
  setTimeout(runCleanup, 5 * 60 * 1000); // 5 min após boot
  // Depois uma vez por dia (24h)
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
  console.log('[cleanup] Agendamento de limpeza automática ativado');
}

module.exports = { startCleanupScheduler, runCleanup };
