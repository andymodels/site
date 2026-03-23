const router = require('express').Router();
const db     = require('../db');

// store messages in DB (no email dependency)
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

router.post('/', (req, res) => {
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

  res.json({ ok: true });
});

module.exports = router;
