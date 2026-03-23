const router = require('express').Router();
const config = require('../config');

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== config.adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  res.json({ token: config.adminSecret });
});

module.exports = router;
