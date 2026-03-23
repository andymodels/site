const router = require('express').Router();
const multer = require('multer');
const db = require('../db');
const storage = require('../services/storage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas JPG e PNG são aceitos.'));
  },
});

router.post('/', upload.array('photos', 5), (req, res) => {
  const { name, email, phone, age, height, city, state, instagram, category } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'E-mail é obrigatório.' });

  const photos = (req.files || []).map(f => storage.saveFile(f));

  db.prepare(`
    INSERT INTO applications (name, email, phone, age, height, city, state, instagram, category, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    email.trim(),
    phone || null,
    age ? parseInt(age) : null,
    height || null,
    city || null,
    state || null,
    instagram || null,
    category || 'women',
    JSON.stringify(photos),
  );

  res.status(201).json({ ok: true });
});

module.exports = router;
