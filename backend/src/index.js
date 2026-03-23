require('dotenv').config();
const config = require('./config');
config.validate();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// Garantir que diretórios de uploads existem — com fallback se sem permissão
function safeUploadsDir(preferred) {
  const fallback = path.join(__dirname, '../../uploads');
  const dirs = [preferred, path.join(preferred, 'models')];
  try {
    dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
    return preferred;
  } catch (e) {
    console.warn(`[startup] Sem permissão em ${preferred}, usando fallback: ${fallback}`);
    [fallback, path.join(fallback, 'models')].forEach(d => {
      try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); } catch (_) {}
    });
    return fallback;
  }
}
const uploadsDir = safeUploadsDir(config.uploadsDir);

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/uploads', express.static(uploadsDir));

app.use('/api/admin/auth',   require('./routes/adminAuth'));
app.use('/api/admin/models', require('./routes/adminModels'));
app.use('/api/admin/sync',   require('./routes/adminSync'));
app.use('/api/admin/home',   require('./routes/homeContent'));
app.use('/api/models',       require('./routes/publicModels'));
app.use('/api/models',       require('./routes/compositeRoute'));
app.use('/api/home',         require('./routes/homeContent'));
app.use('/api/instagram',    require('./routes/instagram'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/contact',      require('./routes/contact'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/admin/settings', require('./routes/settings'));
app.use('/api/radio',        require('./routes/radio'));
app.use('/api/admin/radio',  require('./routes/radio'));

app.get('/health', (req, res) => res.json({ ok: true }));

// ── Serve React frontend in production ────────────────────────────────────────
const DIST = path.join(__dirname, '../../frontend/dist');
const DIST_INDEX = path.join(DIST, 'index.html');

console.log('[server] DIST path:', DIST);
console.log('[server] Frontend dist exists:', fs.existsSync(DIST_INDEX));

app.use(express.static(DIST));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return;
  if (fs.existsSync(DIST_INDEX)) {
    res.sendFile(DIST_INDEX);
  } else {
    res.status(503).send('Frontend not built. Run: cd frontend && npm run build');
  }
});

app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);

  const { runSync } = require('./services/driveSync');
  const intervalMs = config.drive.syncIntervalMs;

  setTimeout(() => {
    console.log('[driveSync] Iniciando primeira sincronização automática...');
    runSync().catch(e => console.error('[driveSync]', e.message));
  }, 10 * 1000);

  setInterval(() => {
    console.log(`[driveSync] Sincronização automática (a cada ${intervalMs / 60000}min)...`);
    runSync().catch(e => console.error('[driveSync]', e.message));
  }, intervalMs);
});
