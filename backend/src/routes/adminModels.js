const router = require('express').Router();
const multer = require('multer');
const https  = require('https');
const http   = require('http');
const db     = require('../db');
const adminAuth = require('../middleware/auth');
const { processImageBuffer, clearModelImages, thumbFromFull } = require('../services/imageProcessor');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

function parseField(raw, fallback) {
  if (raw === undefined) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function serializeModel(r) {
  return {
    ...r,
    images:     JSON.parse(r.images     || '[]'),
    media:      JSON.parse(r.media      || '[]'),
    categories: JSON.parse(r.categories || '[]'),
  };
}

router.use(adminAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM models ORDER BY name ASC').all();
  res.json(rows.map(serializeModel));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(serializeModel(row));
});

router.post('/', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'gallery', maxCount: 20 }]), async (req, res) => {
  try {
    const { name, age, height, bust, waist, hips, shoes, eyes, hair, city, bio, featured, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const categories = parseField(req.body.categories, ['women']);
    const category   = categories[0] || 'women';

    let slug = slugify(name);
    if (db.prepare('SELECT id FROM models WHERE slug = ?').get(slug)) slug = `${slug}-${Date.now()}`;

    clearModelImages(slug);

    const coverFile    = req.files?.cover_image?.[0];
    const galleryFiles = req.files?.gallery || [];

    let cover_image = null, cover_thumb = null;
    const media = [];

    if (coverFile) {
      const { thumb, full } = await processImageBuffer(coverFile.buffer, slug, 1);
      cover_image = full; cover_thumb = thumb;
      media.push({ type: 'image', url: full, thumb, polaroid: false });
    }
    for (let i = 0; i < galleryFiles.length; i++) {
      const { thumb, full } = await processImageBuffer(galleryFiles[i].buffer, slug, media.length + 1);
      media.push({ type: 'image', url: full, thumb, polaroid: false });
    }
    const images = JSON.stringify(media.slice(1).map(m => m.url));

    const result = db.prepare(`
      INSERT INTO models (name, slug, category, categories, age, height, bust, waist, hips, shoes, eyes, hair, city, bio,
        cover_image, cover_thumb, images, media, featured, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, slug, category, JSON.stringify(categories),
      age||null, height||null, bust||null, waist||null, hips||null, shoes||null, eyes||null, hair||null, city||null, bio||null,
      cover_image, cover_thumb, images, JSON.stringify(media),
      featured==='1'?1:0, active==='0'?0:1);

    res.status(201).json(serializeModel(db.prepare('SELECT * FROM models WHERE id = ?').get(result.lastInsertRowid)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'gallery', maxCount: 20 }]), async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { name, age, height, bust, waist, hips, shoes, eyes, hair, city, bio, featured, active, cover_url, ordered_images } = req.body;
    const slug = name ? slugify(name) : model.slug;

    const categories = parseField(req.body.categories, JSON.parse(model.categories || '["women"]'));
    const category   = categories[0] || model.category;

    const coverFile    = req.files?.cover_image?.[0];
    const galleryFiles = req.files?.gallery || [];

    let cover_image = model.cover_image;
    let cover_thumb = model.cover_thumb;

    if (coverFile) {
      const { thumb, full } = await processImageBuffer(coverFile.buffer, slug, 1);
      cover_image = full; cover_thumb = thumb;
    } else if (cover_url) {
      cover_image = cover_url;
      cover_thumb = thumbFromFull(cover_url) || model.cover_thumb;
    }

    // media: start from ordered_images (existing media items JSON) then append new uploads
    let mediaItems = parseField(ordered_images, JSON.parse(model.media || '[]'));

    // Update cover_image/thumb from first image item if applicable
    const firstImg = mediaItems.find(m => m.type === 'image');
    if (firstImg && !coverFile && !cover_url) {
      cover_image = firstImg.url;
      cover_thumb = firstImg.thumb || thumbFromFull(firstImg.url) || cover_thumb;
    }

    for (let i = 0; i < galleryFiles.length; i++) {
      const idx = mediaItems.filter(m=>m.type==='image').length + 1;
      const { thumb, full } = await processImageBuffer(galleryFiles[i].buffer, slug, idx);
      mediaItems.push({ type: 'image', url: full, thumb, polaroid: false });
    }

    const images = JSON.stringify(mediaItems.filter(m=>m.type==='image').map(m=>m.url).slice(1));

    db.prepare(`
      UPDATE models SET name=?, slug=?, category=?, categories=?, age=?, height=?, bust=?, waist=?, hips=?, shoes=?,
        eyes=?, hair=?, city=?, bio=?, cover_image=?, cover_thumb=?, images=?, media=?, featured=?, active=? WHERE id=?
    `).run(
      name||model.name, slug, category, JSON.stringify(categories),
      age??model.age, height??model.height, bust??model.bust,
      waist??model.waist, hips??model.hips, shoes??model.shoes,
      eyes??model.eyes, hair??model.hair, city??model.city,
      bio??model.bio, cover_image, cover_thumb, images, JSON.stringify(mediaItems),
      featured!==undefined?(featured==='1'?1:0):model.featured,
      active!==undefined?(active==='0'?0:1):model.active,
      req.params.id
    );

    res.json(serializeModel(db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH media only (reorder, set polaroid, add video, remove item)
router.patch('/:id/media', (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { media } = req.body;
    if (!Array.isArray(media)) return res.status(400).json({ error: 'media must be array' });

    const firstImg = media.find(m => m.type === 'image');
    const cover_image = firstImg ? firstImg.url   : model.cover_image;
    const cover_thumb = firstImg ? firstImg.thumb || thumbFromFull(firstImg.url) : model.cover_thumb;
    const images = JSON.stringify(media.filter(m=>m.type==='image').map(m=>m.url).slice(1));

    db.prepare('UPDATE models SET media=?, cover_image=?, cover_thumb=?, images=? WHERE id=?')
      .run(JSON.stringify(media), cover_image, cover_thumb, images, req.params.id);

    res.json(serializeModel(db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM models WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── POST /:id/scrape — extract + import images from a portfolio page URL ─────
router.post('/:id/scrape', async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { page_url, replace = false } = req.body;
    if (!page_url) return res.status(400).json({ error: 'page_url required' });

    // 1. Fetch the HTML page
    const html = await new Promise((resolve, reject) => {
      const client = page_url.startsWith('https') ? https : http;
      client.get(page_url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
          return downloadBuffer(r.headers.location).then(b => resolve(b.toString())).catch(reject);
        if (r.statusCode !== 200) return reject(new Error(`HTTP ${r.statusCode}`));
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => resolve(Buffer.concat(chunks).toString()));
        r.on('error', reject);
      }).on('error', reject);
    });

    // 2. Extract image URLs — prefer _rw_1200, dedupe by UUID
    const pattern = /https:\/\/cdn\.myportfolio\.com\/[a-f0-9]+\/([a-f0-9-]+)_rw[^"'\s>]+\.(JPG|JPEG|PNG|jpg|jpeg|png)[^"'\s>]*/gi;
    const seen = new Set();
    const imageUrls = [];
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const uuid = match[1];
      const fullUrl = match[0];
      // Skip logos/icons (small PNG overlays, thumbnails, social icons)
      if (fullUrl.includes('_carw_') || fullUrl.includes('_rwc_0x0x440') || fullUrl.includes('_rwc_0x0x595')) continue;
      // Skip small resized variants – prefer _rw_1200 only
      if (!fullUrl.includes('_rw_1200') && !fullUrl.includes('_rw_1920')) continue;
      if (!seen.has(uuid)) {
        seen.add(uuid);
        imageUrls.push(fullUrl);
      }
    }

    if (!imageUrls.length) {
      return res.status(422).json({ error: 'Nenhuma imagem encontrada na página. Verifique se a URL é de uma página de modelo (ex: andymodels.com/nome-do-modelo).' });
    }

    // 3. Optionally clear existing media
    if (replace) {
      const media = JSON.parse(model.media || '[]');
      const path = require('path');
      const fs   = require('fs');
      for (const item of media) {
        for (const f of [item.url, item.thumb]) {
          if (f?.startsWith('/uploads/')) {
            const abs = path.join(__dirname, '../../..', f);
            if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
          }
        }
      }
      db.prepare("UPDATE models SET media='[]', images='[]', cover_image=NULL, cover_thumb=NULL WHERE id=?").run(req.params.id);
    }

    // 4. Download + process each image
    const freshModel = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    const mediaItems = JSON.parse(freshModel.media || '[]');
    const results = [];
    const errors  = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      try {
        const buffer = await downloadBuffer(url);
        const imgIdx = mediaItems.filter(m => m.type === 'image').length + 1;
        const { thumb, full } = await processImageBuffer(buffer, model.slug, imgIdx);
        const item = { type: 'image', url: full, thumb, polaroid: false, source_url: url };
        mediaItems.push(item);
        results.push(item);
      } catch (e) {
        errors.push({ url, error: e.message });
      }
    }

    const firstImg   = mediaItems.find(m => m.type === 'image');
    const coverImage = firstImg?.url   || null;
    const coverThumb = firstImg?.thumb || null;
    const images     = JSON.stringify(mediaItems.filter(m => m.type === 'image').map(m => m.url).slice(1));

    db.prepare('UPDATE models SET media=?, cover_image=?, cover_thumb=?, images=? WHERE id=?')
      .run(JSON.stringify(mediaItems), coverImage, coverThumb, images, req.params.id);

    res.json({ ok: true, found: imageUrls.length, imported: results.length, errors, media: mediaItems });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /:id/media/clear — remove all images from a model ────────────────
router.delete('/:id/media/clear', (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    // Delete local files for images stored in /uploads/
    const media = JSON.parse(model.media || '[]');
    const path  = require('path');
    const fs    = require('fs');
    for (const item of media) {
      if (item.type === 'image' && item.url?.startsWith('/uploads/')) {
        const abs = path.join(__dirname, '../../..', item.url);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
      if (item.thumb?.startsWith('/uploads/')) {
        const abs = path.join(__dirname, '../../..', item.thumb);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    }

    db.prepare(
      'UPDATE models SET media=\'[]\', images=\'[]\', cover_image=NULL, cover_thumb=NULL WHERE id=?'
    ).run(req.params.id);

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Helpers for URL download ─────────────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const ct = res.headers['content-type'] || '';
      if (ct.includes('text/html') || ct.includes('text/xml') || ct.includes('application/xml')) {
        res.resume(); // drain
        return reject(new Error(`URL retornou HTML/página web, não uma imagem. Cole a URL direta da imagem (ex: .../foto.jpg), não o link da página.`));
      }
      if (ct && !ct.startsWith('image/') && !ct.startsWith('application/octet')) {
        res.resume();
        return reject(new Error(`Tipo de conteúdo inválido: ${ct}. Use URLs diretas de imagens JPG/PNG.`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function isImageUrl(url) {
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url) ||
    url.includes('image') || url.includes('foto') || url.includes('photo');
}

// ─── POST /:id/media/url — download + process + store locally ────────────────
router.post('/:id/media/url', async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { urls, polaroid = false } = req.body;
    // Accept single url string or array of urls
    const urlList = Array.isArray(urls) ? urls : (req.body.url ? [req.body.url] : []);
    if (!urlList.length) return res.status(400).json({ error: 'url or urls required' });

    const mediaItems = JSON.parse(model.media || '[]');
    const results = [];
    const errors  = [];

    for (const rawUrl of urlList) {
      const url = rawUrl.trim();
      if (!url) continue;
      try {
        const buffer = await downloadBuffer(url);
        const imgIdx = mediaItems.filter(m => m.type === 'image').length + 1;
        const { thumb, full } = await processImageBuffer(buffer, model.slug, imgIdx);
        const item = { type: 'image', url: full, thumb, polaroid: !!polaroid, source_url: url };
        mediaItems.push(item);
        results.push(item);
      } catch (e) {
        errors.push({ url, error: e.message });
      }
    }

    // Rebuild cover + images
    const firstImg   = mediaItems.find(m => m.type === 'image');
    const coverImage = firstImg?.url   || model.cover_image;
    const coverThumb = firstImg?.thumb || model.cover_thumb;
    const images     = JSON.stringify(mediaItems.filter(m => m.type === 'image').map(m => m.url).slice(1));

    db.prepare('UPDATE models SET media=?, cover_image=?, cover_thumb=?, images=? WHERE id=?')
      .run(JSON.stringify(mediaItems), coverImage, coverThumb, images, req.params.id);

    res.json({ ok: true, imported: results.length, errors, media: mediaItems });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /:id/media/url-direct — store external URL without downloading ──────
router.post('/:id/media/url-direct', (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { urls, polaroid = false } = req.body;
    const urlList = Array.isArray(urls) ? urls : (req.body.url ? [req.body.url] : []);
    if (!urlList.length) return res.status(400).json({ error: 'url or urls required' });

    const mediaItems = JSON.parse(model.media || '[]');

    for (const rawUrl of urlList) {
      const url = rawUrl.trim();
      if (!url) continue;
      mediaItems.push({ type: 'image', url, thumb: null, polaroid: !!polaroid, source: 'external' });
    }

    const firstImg   = mediaItems.find(m => m.type === 'image');
    const coverImage = firstImg?.url   || model.cover_image;
    const coverThumb = firstImg?.thumb || model.cover_thumb;
    const images     = JSON.stringify(mediaItems.filter(m => m.type === 'image').map(m => m.url).slice(1));

    db.prepare('UPDATE models SET media=?, cover_image=?, cover_thumb=?, images=? WHERE id=?')
      .run(JSON.stringify(mediaItems), coverImage, coverThumb, images, req.params.id);

    res.json({ ok: true, added: urlList.length, media: mediaItems });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
