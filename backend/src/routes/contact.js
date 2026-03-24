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
        <div style="font-family: Arial; max-width: 600px;">
          <h2>📩 Novo contato - Andy Models</h2>
          <hr/>
          <p><strong>Nome:</strong> ${name.trim()}</p>
          <p><strong>Email:</strong> ${email.trim()}</p>
          <p><strong>Telefone:</strong> ${phone?.trim() || '—'}</p>
          <p><strong>Instagram:</strong> ${instagram?.trim() || '—'}</p>
          <p><strong>Mensagem:</strong></p>
          <p style="background:#f5f5f5;padding:10px;border-radius:6px;white-space:pre-wrap;">
            ${message.trim()}
          </p>
        </div>
      `
    });
  } catch (err) {
    console.error('[contact] Falha ao enviar e-mail via Resend:', err.message);
  }

  res.json({ ok: true });
});

module.exports = router;
