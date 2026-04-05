const router = require('express').Router();
const db     = require('../db');
const { getIp, checkRateLimit, sanitize, isHoneypot } = require('../utils/spam');
const { getResend } = require('../utils/resendClient');

db.exec(`
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    instagram TEXT,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

router.post('/', async (req, res) => {
  const ip = getIp(req);

  if (isHoneypot(req.body)) {
    return res.json({ ok: true });
  }

  if (!checkRateLimit(ip)) {
    return res.json({ ok: true });
  }

  const name      = sanitize(req.body.name);
  const email     = sanitize(req.body.email);
  const phone     = sanitize(req.body.phone);
  const instagram = sanitize(req.body.instagram);
  const message   = sanitize(req.body.message);

  if (!name || name.length < 3)
    return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres.' });
  if (!email)
    return res.status(400).json({ error: 'Email obrigatório.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Email inválido.' });
  if (!message || message.length < 10)
    return res.status(400).json({ error: 'Mensagem deve ter pelo menos 10 caracteres.' });

  db.prepare(`
    INSERT INTO contact_messages (name, email, phone, instagram, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, phone || null, instagram || null, message);

  const resend = getResend();
  try {
    if (resend) {
      await resend.emails.send({
        from: 'Andy Models <msn@andymodels.com>',
        to: ['msn@andymodels.com'],
        subject: 'Novo contato pelo site',
        html: `
        <div style="font-family: Arial; max-width: 600px;">
          <h2>📩 Novo contato - Andy Models</h2>
          <hr/>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefone:</strong> ${phone || '—'}</p>
          <p><strong>Instagram:</strong> ${instagram || '—'}</p>
          <p><strong>Mensagem:</strong></p>
          <p style="background:#f5f5f5;padding:10px;border-radius:6px;white-space:pre-wrap;">
            ${message}
          </p>
        </div>
      `
      });
    } else {
      console.warn('[contact] RESEND_API_KEY ausente — e-mail não enviado (normal em dev local)');
    }
  } catch (err) {
    console.error('[contact] Falha ao enviar e-mail via Resend:', err.message);
  }

  res.json({ ok: true });
});

module.exports = router;
