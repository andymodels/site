const router    = require('express').Router();
const multer    = require('multer');
const path      = require('path');
const sharp     = require('sharp');
const db        = require('../db');
const adminAuth = require('../middleware/auth');
const storage   = require('../services/storage');
const { getIp, checkRateLimit, sanitize, isHoneypot } = require('../utils/spam');
const { getResend } = require('../utils/resendClient');

try { db.prepare('ALTER TABLE applications ADD COLUMN thumb_url TEXT').run(); } catch {}
try { db.prepare('ALTER TABLE applications ADD COLUMN pdf_url TEXT').run(); } catch {}

// ── Multer — memória ───────────────────────────────────────────────────────
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato não permitido. Envie apenas JPG, PNG ou PDF.'));
  },
});

function applicationsKey(ext) {
  const dot = ext.startsWith('.') ? ext : `.${ext}`;
  return `applications/${Date.now()}-${Math.round(Math.random() * 1e12)}${dot}`;
}

// ── Resend ─────────────────────────────────────────────────────────────────
async function sendApplicationEmail(appData, photoFiles) {
  const resend = getResend();
  if (!resend) {
    console.warn('[mail] RESEND_API_KEY ausente — e-mail não enviado (normal em dev local)');
    return { ok: false };
  }

  const cat = appData.category === 'men' ? 'Masculino' : 'Feminino';
  const loc = [appData.city, appData.state].filter(Boolean).join(' / ') || '—';

  const attachments = (photoFiles || []).map((f, i) => ({
    filename: `foto_${i + 1}.${f.mimetype === 'image/png' ? 'png' : 'jpg'}`,
    content:  f.buffer.toString('base64'),
  }));

  await resend.emails.send({
    from: 'Andy Models <msn@andymodels.com>',
    to: ['msn@andymodels.com'],
    subject: `Nova inscrição: ${appData.name} (${cat})`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;color:#222">
        <h2 style="font-size:16px;letter-spacing:3px;text-transform:uppercase;border-bottom:1px solid #eee;padding-bottom:12px">
          Nova Inscrição — Andy Models
        </h2>
        <table style="font-size:14px;border-collapse:collapse;width:100%;margin-top:16px">
          ${[
            ['Nome',            appData.name],
            ['Categoria',       cat],
            ['Idade',           appData.age || '—'],
            ['Altura',          appData.height || '—'],
            ['Cidade / Estado', loc],
            ['Telefone',        appData.phone || '—'],
            ['E-mail',          `<a href="mailto:${appData.email}">${appData.email}</a>`],
            ['Instagram',       appData.instagram || '—'],
            ['Fotos enviadas',  `${photoFiles.length} foto(s) em anexo`],
          ].map(([label, val]) => `
            <tr style="border-bottom:1px solid #f5f5f5">
              <td style="padding:8px 20px 8px 0;color:#888;width:140px;vertical-align:top">${label}</td>
              <td style="padding:8px 0">${val}</td>
            </tr>
          `).join('')}
        </table>
        <p style="font-size:13px;color:#555;margin-top:24px">Fotos em anexo neste e-mail.</p>
        <p style="font-size:11px;color:#bbb;margin-top:8px">
          Acesse o painel admin para visualizar e atualizar o status desta inscrição.
        </p>
      </div>
    `,
  });

  return { ok: true };
}

// ── POST /api/applications ─────────────────────────────────────────────────
router.post('/', upload.fields([{ name: 'photos', maxCount: 5 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
  const ip = getIp(req);

  if (isHoneypot(req.body)) {
    return res.status(201).json({ ok: true, id: 0, mailSent: false });
  }

  if (!checkRateLimit(ip)) {
    return res.status(201).json({ ok: true, id: 0, mailSent: false });
  }

  const name      = sanitize(req.body.name);
  const email     = sanitize(req.body.email);
  const phone     = sanitize(req.body.phone);
  const age       = req.body.age;
  const height    = sanitize(req.body.height);
  const city      = sanitize(req.body.city);
  const state     = sanitize(req.body.state);
  const instagram = sanitize(req.body.instagram);
  const category  = sanitize(req.body.category);

  if (!name || name.length < 3) return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres.' });
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });

  const photoFiles = req.files?.photos || [];
  const pdfFiles   = req.files?.pdf || [];

  if (photoFiles.length < 3) {
    return res.status(400).json({ error: 'Envie pelo menos 3 fotos.' });
  }

  const badPhoto = photoFiles.find(f => !['image/jpeg', 'image/png'].includes(f.mimetype));
  if (badPhoto) return res.status(400).json({ error: 'Apenas JPG e PNG são aceitos para fotos.' });

  const oversized = photoFiles.find(f => f.size > 10 * 1024 * 1024);
  if (oversized) return res.status(400).json({ error: 'Cada foto deve ter no máximo 10MB.' });

  const savedPhotos = [];
  try {
    for (let i = 0; i < photoFiles.length; i++) {
      const f = photoFiles[i];
      const ext = f.mimetype === 'image/png' ? '.png' : '.jpg';
      const url = await storage.saveFile({
        buffer: f.buffer,
        mimetype: f.mimetype,
        originalname: `photo${ext}`,
        key: applicationsKey(ext),
      });
      savedPhotos.push(url);
    }
  } catch (e) {
    console.error('[applications] upload fotos:', e.message);
    return res.status(500).json({ error: 'Erro ao enviar fotos. Tente novamente.' });
  }

  let thumbUrl = null;
  try {
    const thumbBuffer = await sharp(photoFiles[0].buffer)
      .resize({ height: 300, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
    thumbUrl = await storage.saveFile({
      buffer: thumbBuffer,
      mimetype: 'image/jpeg',
      originalname: 'thumb.jpg',
      key: applicationsKey('.jpg'),
    });
  } catch (e) {
    console.error('[thumb] Erro ao gerar/enviar thumbnail:', e.message);
  }

  let pdfUrl = null;
  if (pdfFiles.length > 0) {
    try {
      pdfUrl = await storage.saveFile({
        buffer: pdfFiles[0].buffer,
        mimetype: 'application/pdf',
        originalname: 'material.pdf',
        key: applicationsKey('.pdf'),
      });
    } catch (e) {
      console.error('[applications] upload PDF:', e.message);
      return res.status(500).json({ error: 'Erro ao enviar PDF. Tente novamente.' });
    }
  }

  const result = db.prepare(`
    INSERT INTO applications
      (name, email, phone, age, height, city, state, instagram, category, photos, thumb_url, pdf_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `).run(
    name, email,
    phone || null, age ? parseInt(age) : null,
    height || null, city || null, state || null,
    instagram || null, category || null,
    JSON.stringify(savedPhotos),
    thumbUrl,
    pdfUrl,
  );

  const appData = { name, email, phone, age, height, city, state, instagram, category };
  let mailResult;
  try {
    mailResult = await sendApplicationEmail(appData, photoFiles);
  } catch (e) {
    console.error('[mail] Erro ao enviar:', e.message);
    db.prepare("UPDATE applications SET status='new', notes=? WHERE id=?")
      .run(`[MAIL FALHOU: ${e.message}]`, result.lastInsertRowid);
    mailResult = { ok: false, reason: e.message };
  }

  res.status(201).json({
    ok: true,
    id: result.lastInsertRowid,
    mailSent: mailResult?.ok ?? false,
  });
});

// ── GET /api/applications/admin ───────────────────────────────────────────
router.get('/admin', adminAuth, (req, res) => {
  const { category, status } = req.query;
  let query = 'SELECT * FROM applications';
  const params = [];
  const conds = [];
  if (category) { conds.push('category = ?'); params.push(category); }
  if (status)   { conds.push('status = ?');   params.push(status); }
  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows.map(r => ({ ...r, photos: JSON.parse(r.photos || '[]') })));
});

// ── GET /api/applications/admin/:id ──────────────────────────────────────
router.get('/admin/:id', adminAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, photos: JSON.parse(row.photos || '[]') });
});

// ── PATCH /api/applications/admin/:id ────────────────────────────────────
router.patch('/admin/:id', adminAuth, (req, res) => {
  const { status, notes } = req.body;
  const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  if (status !== undefined) db.prepare('UPDATE applications SET status=? WHERE id=?').run(status, req.params.id);
  if (notes  !== undefined) db.prepare('UPDATE applications SET notes=? WHERE id=?').run(notes, req.params.id);
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  res.json({ ...row, photos: JSON.parse(row.photos || '[]') });
});

async function deleteApplicationMedia(row) {
  if (!row) return;
  try {
    const urls = JSON.parse(row.photos || '[]');
    for (const u of urls) {
      await storage.deleteFile(u);
    }
  } catch {}
  await storage.deleteFile(row.thumb_url);
  await storage.deleteFile(row.pdf_url);
}

// ── DELETE /api/applications/admin/:id ───────────────────────────────────
router.delete('/admin/:id', adminAuth, async (req, res) => {
  const app = db.prepare('SELECT photos, thumb_url, pdf_url FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  try {
    await deleteApplicationMedia(app);
  } catch (e) {
    console.error('[applications] delete media:', e.message);
  }
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Limpeza automática: após 30 dias apaga originais no storage, mantém thumb ─────
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function runCleanup() {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const old = db.prepare(`
    SELECT id, photos, pdf_url FROM applications
    WHERE created_at < ? AND photos != '[]' AND photos IS NOT NULL
    AND status != 'approved'
  `).all(cutoff);

  let cleaned = 0;
  for (const row of old) {
    try {
      const files = JSON.parse(row.photos || '[]');
      for (const p of files) {
        await storage.deleteFile(p);
        cleaned++;
      }
      await storage.deleteFile(row.pdf_url);
    } catch (e) {
      console.error('[cleanup applications]', e.message);
    }
    db.prepare('UPDATE applications SET photos=?, pdf_url=NULL WHERE id=?').run('[]', row.id);
  }
  if (old.length > 0) {
    console.log(`[cleanup] ${old.length} inscrição(ões) limpas, ${cleaned} ficheiro(s) removidos do storage.`);
  }
}

runCleanup().catch(e => console.error('[cleanup applications]', e.message));
setInterval(() => {
  runCleanup().catch(err => console.error('[cleanup applications]', err.message));
}, 6 * 60 * 60 * 1000);

module.exports = router;
