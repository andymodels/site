const fs = require('fs');
const db = require('../db');

/** Rotas de uma palavra que não são páginas de modelo (App.jsx + rotas da API). */
const RESERVED_SLUGS = new Set([
  'women',
  'men',
  'creators',
  'about',
  'inscreva-se',
  'contact',
  'admin',
  'api',
  'uploads',
  'health',
  'assets',
]);

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/\n/g, ' ');
}

function getModelForOg(slug) {
  const row = db
    .prepare(
      `SELECT name, slug, bio, cover_image, images, media FROM models WHERE slug = ? AND active = 1`
    )
    .get(slug);
  if (!row) return null;
  return {
    ...row,
    images: JSON.parse(row.images || '[]'),
    media: JSON.parse(row.media || '[]'),
  };
}

function pickOgImage(model) {
  if (model.cover_image) return model.cover_image;
  if (Array.isArray(model.media) && model.media.length) {
    for (const m of model.media) {
      if (m && m.url && (m.type === 'image' || !m.type)) return m.url;
    }
  }
  if (Array.isArray(model.images) && model.images.length) return model.images[0];
  return null;
}

function getOrigin(req) {
  const explicit = process.env.PUBLIC_SITE_URL || (process.env.FRONTEND_URL || '').split(',')[0].trim();
  if (explicit) {
    try {
      const u = new URL(explicit.includes('://') ? explicit : `https://${explicit}`);
      return `${u.protocol}//${u.host}`;
    } catch (_) { /* fall through */ }
  }
  const host = req.get('x-forwarded-host') || req.get('host');
  let proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  if (process.env.NODE_ENV === 'production') proto = 'https';
  return `${proto}://${host}`;
}

function absoluteUrl(req, pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) {
    if (process.env.NODE_ENV === 'production' && /^http:\/\//i.test(pathOrUrl)) {
      return pathOrUrl.replace(/^http:\/\//i, 'https://');
    }
    return pathOrUrl;
  }
  const origin = getOrigin(req);
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${p}`;
}

function injectOg(html, { title, description, imageUrl, pageUrl }) {
  const desc = description || 'Andy Models – Agência de Modelos';
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  out = out.replace(
    /<meta property="og:type"[^>]*>/,
    '<meta property="og:type" content="article" />'
  );
  out = out.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  out = out.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`
  );
  out = out.replace(
    /<meta property="og:image"[^>]*>/,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`
  );
  out = out.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`
  );
  out = out.replace(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  out = out.replace(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`
  );
  out = out.replace(
    /<meta name="twitter:image"[^>]*>/,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
  );
  out = out.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(desc)}" />`
  );
  return out;
}

/**
 * Antes do SPA: para /:slug de modelo ativo, devolve index.html com og:* já preenchidos
 * (WhatsApp/Facebook não executam JavaScript).
 */
function createModelOgMiddleware(distIndexPath) {
  let cachedIndex = null;

  return function modelOgMiddleware(req, res, next) {
    const { slug } = req.params;
    if (!slug || RESERVED_SLUGS.has(slug)) return next();

    const model = getModelForOg(slug);
    if (!model) return next();

    if (!cachedIndex) {
      try {
        cachedIndex = fs.readFileSync(distIndexPath, 'utf8');
      } catch (e) {
        return next();
      }
    }

    const origin = getOrigin(req);

    const imgPath = pickOgImage(model);
    const imageUrl = absoluteUrl(req, imgPath) || `${origin}/logo.png`;
    const pageUrl = `${origin}/${model.slug}`;

    const title = `${model.name} – Andy Models`;
    const description = model.bio && model.bio.trim()
      ? model.bio.trim().slice(0, 200)
      : `${model.name} – Andy Models. Agência de modelos com atuação nacional e internacional.`;

    const body = injectOg(cachedIndex, { title, description, imageUrl, pageUrl });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(body);
  };
}

module.exports = { createModelOgMiddleware, RESERVED_SLUGS };
