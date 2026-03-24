const router    = require('express').Router();
const multer    = require('multer');
const nodemailer = require('nodemailer');
const path      = require('path');
const fs        = require('fs');
const db        = require('../db');
const config    = require('../config');
const adminAuth = require('../middleware/auth');

// ── Diretório temp de fotos ────────────────────────────────────────────────
const TEMP_DIR = path.join(config.uploadsDir, 'temp');
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ── Multer — memória (processamos aqui antes de salvar) ────────────────────
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato não permitido. Envie apenas JPG, PNG ou PDF.'));
  },
});

// ── SMTP ───────────────────────────────────────────────────────────────────
function createMailer() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendApplicationEmail(appData, photoFiles, pdfFile) {
  const mailer = createMailer();
  if (!mailer) {
    console.warn('[mail] SMTP não configurado — configure SMTP_HOST, SMTP_USER e SMTP_PASS');
    return { ok: false, reason: 'SMTP não configurado' };
  }

  const to  = process.env.NOTIFICATION_EMAIL || 'msn@andymodels.com';
  const cat = appData.category === 'men' ? 'Masculino' : 'Feminino';
  const loc = [appData.city, appData.state].filter(Boolean).join(' / ') || '—';

  const attachments = (photoFiles || []).map((f, i) => ({
    filename: `foto_${i + 1}.${f.mimetype === 'image/png' ? 'png' : 'jpg'}`,
    content:  f.buffer,
    contentType: f.mimetype,
  }));

  if (pdfFile) {
    attachments.push({
      filename: 'material.pdf',
      content:  pdfFile.buffer,
      contentType: 'application/pdf',
    });
  }

  await mailer.sendMail({
    from: `"Andy Models Site" <${process.env.SMTP_USER}>`,
    to,
    replyTo: appData.email,
    subject: `Nova inscrição: ${appData.name} (${cat})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;color:#222">
        <h2 style="font-size:16px;letter-spacing:3px;text-transform:uppercase;border-bottom:1px solid #eee;padding-bottom:12px">
          Nova Inscrição — Andy Models
        </h2>
        <table style="font-size:14px;border-collapse:collapse;width:100%;margin-top:16px">
          ${[
            ['Nome',           appData.name],
            ['Categoria',      cat],
            ['Idade',          appData.age || '—'],
            ['Altura',         appData.height || '—'],
            ['Cidade / Estado',loc],
            ['Telefone',       appData.phone || '—'],
            ['E-mail',         `<a href="mailto:${appData.email}">${appData.email}</a>`],
            ['Instagram',      appData.instagram
              ? `<a href="https://instagram.com/${appData.instagram.replace('@','')}">@${appData.instagram.replace('@','')}</a>`
              : '—'],
            ['Fotos enviadas', `${attachments.length} foto(s) em anexo`],
          ].map(([label, val]) => `
            <tr style="border-bottom:1px solid #f5f5f5">
              <td style="padding:8px 20px 8px 0;color:#888;width:140px;vertical-align:top">${label}</td>
              <td style="padding:8px 0">${val}</td>
            </tr>
          `).join('')}
        </table>
        <p style="font-size:11px;color:#bbb;margin-top:28px">
          Acesse o painel admin para atualizar o status desta inscrição.
        </p>
      </div>
    `,
    attachments,
  });

  return { ok: true };
}

// ── POST /api/applications ─────────────────────────────────────────────────
router.post('/', upload.fields([{ name: 'photos', maxCount: 5 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
  const { name, email, phone, age, height, city, state, instagram, category } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (!email?.trim()) return res.status(400).json({ error: 'E-mail é obrigatório.' });

  const photoFiles = req.files?.photos || [];
  const pdfFiles   = req.files?.pdf || [];

  if (photoFiles.length < 3) {
    return res.status(400).json({ error: 'Envie pelo menos 3 fotos.' });
  }

  // Validar que fotos são apenas imagens
  const badPhoto = photoFiles.find(f => !['image/jpeg', 'image/png'].includes(f.mimetype));
  if (badPhoto) return res.status(400).json({ error: 'Apenas JPG e PNG são aceitos para fotos.' });

  // Validar tamanho individual das imagens (5MB)
  const oversized = photoFiles.find(f => f.size > 5 * 1024 * 1024);
  if (oversized) return res.status(400).json({ error: 'Cada foto deve ter no máximo 5MB.' });

  // 1. Salvar fotos em /uploads/temp
  const savedPhotos = [];
  const now = Date.now();
  for (let i = 0; i < photoFiles.length; i++) {
    const f    = photoFiles[i];
    const ext  = f.mimetype === 'image/png' ? 'png' : 'jpg';
    const fname = `app_${now}_${i + 1}.${ext}`;
    const fpath = path.join(TEMP_DIR, fname);
    fs.writeFileSync(fpath, f.buffer);
    savedPhotos.push(`/uploads/temp/${fname}`);
  }

  // Salvar PDF se enviado
  let savedPdf = null;
  if (pdfFiles.length > 0) {
    const pf    = pdfFiles[0];
    const pfname = `app_${now}_material.pdf`;
    fs.writeFileSync(path.join(TEMP_DIR, pfname), pf.buffer);
    savedPdf = `/uploads/temp/${pfname}`;
  }

  // 2. Salvar dados no banco
  const result = db.prepare(`
    INSERT INTO applications
      (name, email, phone, age, height, city, state, instagram, category, photos, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `).run(
    name.trim(), email.trim(),
    phone || null, age ? parseInt(age) : null,
    height || null, city || null, state || null,
    instagram || null, category || 'women',
    JSON.stringify(savedPhotos),
  );

  // 3. Enviar e-mail (com retry em caso de falha)
  const appData = { name: name.trim(), email: email.trim(), phone, age, height, city, state, instagram, category };
  let mailResult;
  try {
    mailResult = await sendApplicationEmail(appData, photoFiles, savedPdf ? pdfFiles[0] : null);
  } catch (e) {
    console.error('[mail] Erro ao enviar:', e.message);
    // Marcar no banco que e-mail falhou (não perdemos o cadastro)
    db.prepare("UPDATE applications SET status='new', notes=? WHERE id=?")
      .run(`[MAIL FALHOU: ${e.message}]`, result.lastInsertRowid);
    mailResult = { ok: false, reason: e.message };
  }

  // 4. Responder — cadastro salvo independente do e-mail
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
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
});

// ── DELETE /api/applications/admin/:id ───────────────────────────────────
router.delete('/admin/:id', adminAuth, (req, res) => {
  const app = db.prepare('SELECT photos FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  // Remover fotos do disco
  try {
    JSON.parse(app.photos || '[]').forEach(p => {
      const abs = path.join(__dirname, '../../../', p);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    });
  } catch {}
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
