const ipMinute = new Map();
const ipHour   = new Map();

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded
    ? forwarded.split(',')[0].trim()
    : (req.ip || 'unknown');

  // Normalizar IPv4-mapped IPv6: ::ffff:1.2.3.4 → 1.2.3.4
  return raw.replace(/^::ffff:/, '');
}

function checkRateLimit(ip) {
  const now    = Date.now();
  const minute = (ipMinute.get(ip) || []).filter(t => now - t < 60_000);
  const hour   = (ipHour.get(ip)   || []).filter(t => now - t < 3_600_000);

  const minCount  = minute.length;
  const hourCount = hour.length;

  console.log(`[rate-limit] IP=${ip} | minuto=${minCount}/3 | hora=${hourCount}/10 | ts=${new Date(now).toISOString()}`);

  if (minCount >= 3 || hourCount >= 10) {
    console.log(`[rate-limit] BLOQUEADO IP=${ip}`);
    return false;
  }

  minute.push(now);
  hour.push(now);
  ipMinute.set(ip, minute);
  ipHour.set(ip, hour);
  return true;
}

function sanitize(val) {
  if (val == null) return val;
  return String(val)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function isHoneypot(body) {
  return !!(body.website && String(body.website).trim().length > 0);
}

module.exports = { getIp, checkRateLimit, sanitize, isHoneypot };
