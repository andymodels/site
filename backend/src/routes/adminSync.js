const router = require('express').Router();
const adminAuth = require('../middleware/auth');
const { runSync, getState } = require('../services/driveSync');

router.use(adminAuth);

router.get('/status', (req, res) => {
  res.json(getState());
});

router.post('/run', (req, res) => {
  const { running } = getState();
  if (running) {
    return res.status(409).json({ error: 'Sincronização já em execução.' });
  }
  runSync().catch(e => console.error('[driveSync] Unhandled error:', e));
  res.json({ ok: true, message: 'Sincronização iniciada.' });
});

module.exports = router;
