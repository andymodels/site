const config = require('../config');

module.exports = function adminAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || token !== config.adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
