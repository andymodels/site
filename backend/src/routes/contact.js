const router = require('express').Router();
const db     = require('../db');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const { name, email, phone, instagram, message } = req.body;

  if (!name?.trim())    return res.status(400).json({ error: 'Nome obrigatório.' });
  if (!email?.trim())   return res.status(400).json({ error: 'Email obrigatório.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Email inválido.' });
  if (!message?.trim()) return res.status(400).json({ error: 'Mensagem obrigatória.' });

  db.prepare(`
    INSERT INTO contact_messages (name, email, phone, instagram, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), email.trim(), phone?.trim() || null, instagram?.trim() || null, message.trim());

  try {
    await resend.emails.send({
      from: 'Andy Models <msn@andymodels.com>',
      to: ['msn@andymodels.com'],
      subject: 'Novo contato pelo site',
      html: `
        <h2 style="font-family:sans-serif;color:#111;">Novo contato pelo site</h2>
        <table style="font-family:sans-serif;font-size:14px;color:#333;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Nome</td><td>${name.trim()}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td><a href="mailto:${email.trim()}">${email.trim()}</a></td></tr>
          ${phone ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Telefone</td><td>${phone.trim()}</td></tr>` : ''}
          ${instagram ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Instagram</td><td>${instagram.trim()}</td></tr>` : ''}
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">Mensagem</td><td style="white-space:pre-wrap;">${message.trim()}</td></tr>
        </table>
      `
    });
  } catch (err) {
    console.error('[contact] Falha ao enviar e-mail via Resend:', err.message);
  }

  res.json({ ok: true });
});

module.exports = router;
