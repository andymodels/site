const router = require('express').Router();
const multer = require('multer');
const https  = require('https');
const http   = require('http');
const db     = require('../db');
const adminAuth = require('../middleware/auth');
const { processImageBuffer, clearModelImages, thumbFromFull } = require('../services/imageProcessor');
const { google } = require('googleapis');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

function parseField(raw, fallback) {
  if (raw === undefined || raw === null) return fallback;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return raw;
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
    const { name, age, height, bust, waist, hips, shoes, eyes, hair, city, bio, featured, active,
      torax, terno, camisa, manequim, model_status, home_order,
      phone, phone2, email, whatsapp,
      cpf, rg, passport, passport_expiry, visa_type, visa_expiry, nationality,
      address, address_city, address_state, address_country, address_zip,
      bank_name, bank_agency, bank_account, bank_account_type, bank_pix,
      instagram, tiktok, youtube, facebook, twitter,
      emergency_name, emergency_phone, emergency_relation,
      agent_notes, contract_start, contract_end } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const categories = parseField(req.body.categories, ['women']);
    const category   = categories[0] || 'women';

    const slug = slugify(name);
    const existing = db.prepare('SELECT id FROM models WHERE slug = ?').get(slug);
    if (existing) {
      // Modelo já existe — atualiza campos não-imagem recebidos em vez de criar duplicata
      const b = req.body;
      db.prepare(`UPDATE models SET
        category=COALESCE(?,category), categories=COALESCE(?,categories),
        age=COALESCE(?,age), height=COALESCE(?,height),
        bust=COALESCE(?,bust), waist=COALESCE(?,waist), hips=COALESCE(?,hips),
        shoes=COALESCE(?,shoes), eyes=COALESCE(?,eyes), hair=COALESCE(?,hair),
        city=COALESCE(?,city), bio=COALESCE(?,bio),
        torax=COALESCE(?,torax), terno=COALESCE(?,terno),
        camisa=COALESCE(?,camisa), manequim=COALESCE(?,manequim),
        model_status=COALESCE(?,model_status)
        WHERE id=?`).run(
        b.category||null, b.categories ? JSON.stringify(parseField(b.categories,null)) : null,
        b.age||null, b.height||null,
        b.bust||null, b.waist||null, b.hips||null,
        b.shoes||null, b.eyes||null, b.hair||null,
        b.city||null, b.bio||null,
        b.torax||null, b.terno||null,
        b.camisa||null, b.manequim||null,
        b.model_status||null,
        existing.id
      );
      return res.status(200).json(serializeModel(db.prepare('SELECT * FROM models WHERE id=?').get(existing.id)));
    }

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
        cover_image, cover_thumb, images, media, featured, active,
        torax, terno, camisa, manequim, model_status, home_order,
        phone, phone2, email, whatsapp,
        cpf, rg, passport, passport_expiry, visa_type, visa_expiry, nationality,
        address, address_city, address_state, address_country, address_zip,
        bank_name, bank_agency, bank_account, bank_account_type, bank_pix,
        instagram, tiktok, youtube, facebook, twitter,
        emergency_name, emergency_phone, emergency_relation,
        agent_notes, contract_start, contract_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?)
    `).run(name, slug, category, JSON.stringify(categories),
      age||null, height||null, bust||null, waist||null, hips||null, shoes||null, eyes||null, hair||null, city||null, bio||null,
      cover_image, cover_thumb, images, JSON.stringify(media),
      featured==='1'?1:0, active==='0'?0:1,
      torax||null, terno||null, camisa||null, manequim||null, model_status||'In Town', home_order ? parseInt(home_order) : null,
      phone||null, phone2||null, email||null, whatsapp||null,
      cpf||null, rg||null, passport||null, passport_expiry||null, visa_type||null, visa_expiry||null, nationality||null,
      address||null, address_city||null, address_state||null, address_country||null, address_zip||null,
      bank_name||null, bank_agency||null, bank_account||null, bank_account_type||null, bank_pix||null,
      instagram||null, tiktok||null, youtube||null, facebook||null, twitter||null,
      emergency_name||null, emergency_phone||null, emergency_relation||null,
      agent_notes||null, contract_start||null, contract_end||null);

    res.status(201).json(serializeModel(db.prepare('SELECT * FROM models WHERE id = ?').get(result.lastInsertRowid)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'gallery', maxCount: 20 }]), async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { name, age, height, bust, waist, hips, shoes, eyes, hair, city, bio, featured, active, cover_url, ordered_images, slug: slugOverride,
      torax, terno, camisa, manequim, model_status, home_order,
      phone, phone2, email, whatsapp,
      cpf, rg, passport, passport_expiry, visa_type, visa_expiry, nationality,
      address, address_city, address_state, address_country, address_zip,
      bank_name, bank_agency, bank_account, bank_account_type, bank_pix,
      instagram, tiktok, youtube, facebook, twitter,
      emergency_name, emergency_phone, emergency_relation,
      agent_notes, contract_start, contract_end } = req.body;
    const slug = slugOverride ? slugOverride : (name ? slugify(name) : model.slug);

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
        eyes=?, hair=?, city=?, bio=?, cover_image=?, cover_thumb=?, images=?, media=?, featured=?, active=?,
        torax=?, terno=?, camisa=?, manequim=?, model_status=?, home_order=?,
        phone=?, phone2=?, email=?, whatsapp=?,
        cpf=?, rg=?, passport=?, passport_expiry=?, visa_type=?, visa_expiry=?, nationality=?,
        address=?, address_city=?, address_state=?, address_country=?, address_zip=?,
        bank_name=?, bank_agency=?, bank_account=?, bank_account_type=?, bank_pix=?,
        instagram=?, tiktok=?, youtube=?, facebook=?, twitter=?,
        emergency_name=?, emergency_phone=?, emergency_relation=?,
        agent_notes=?, contract_start=?, contract_end=?
      WHERE id=?
    `).run(
      name||model.name, slug, category, JSON.stringify(categories),
      age??model.age, height??model.height, bust??model.bust,
      waist??model.waist, hips??model.hips, shoes??model.shoes,
      eyes??model.eyes, hair??model.hair, city??model.city,
      bio !== undefined ? (bio || null) : model.bio, cover_image, cover_thumb, images, JSON.stringify(mediaItems),
      featured!==undefined?(featured==='1'?1:0):model.featured,
      active!==undefined?(active==='0'?0:1):model.active,
      torax??model.torax, terno??model.terno, camisa??model.camisa, manequim??model.manequim,
      model_status??model.model_status??'In Town',
      home_order !== undefined ? (home_order === '' || home_order === null ? null : parseInt(home_order)) : model.home_order,
      phone??model.phone, phone2??model.phone2, email??model.email, whatsapp??model.whatsapp,
      cpf??model.cpf, rg??model.rg, passport??model.passport, passport_expiry??model.passport_expiry,
      visa_type??model.visa_type, visa_expiry??model.visa_expiry, nationality??model.nationality,
      address??model.address, address_city??model.address_city, address_state??model.address_state,
      address_country??model.address_country, address_zip??model.address_zip,
      bank_name??model.bank_name, bank_agency??model.bank_agency, bank_account??model.bank_account,
      bank_account_type??model.bank_account_type, bank_pix??model.bank_pix,
      instagram??model.instagram, tiktok??model.tiktok, youtube??model.youtube,
      facebook??model.facebook, twitter??model.twitter,
      emergency_name??model.emergency_name, emergency_phone??model.emergency_phone,
      emergency_relation??model.emergency_relation,
      agent_notes??model.agent_notes, contract_start??model.contract_start, contract_end??model.contract_end,
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

// ─── Measurement bilingual parser ────────────────────────────────────────────
// Handles format: "altura 187 height | tórax 97 chest | cabelos CASTANHOS hair BROWN | ..."
// Extracts the English value for each known field.
function parseBilingualMeasurements(text) {
  // EN label → DB column name
  const EN_LABELS = {
    height: 'height',
    chest:  'torax',
    bust:   'bust',
    waist:  'waist',
    hips:   'hips',
    size:   'manequim',
    shoes:  'shoes',
    hair:   'hair',
    eyes:   'eyes',
    suit:   'terno',
    shirt:  'camisa',
  };

  const result = {};
  const segments = text.split('|').map(s => s.trim()).filter(Boolean);

  for (const seg of segments) {
    for (const [label, field] of Object.entries(EN_LABELS)) {
      // Word-boundary check for the EN label
      const re = new RegExp(`(?<![\\w])${label}(?![\\w])`, 'i');
      const match = re.exec(seg);
      if (!match) continue;

      const afterLabel = seg.slice(match.index + label.length).trim();
      const numInSeg   = seg.match(/\d+/);

      if (numInSeg) {
        // Numeric field: value is the number found anywhere in the segment
        result[field] = numInSeg[0];
      } else if (afterLabel) {
        // Color/text field: value is the word(s) after the EN label, already in EN
        result[field] = afterLabel.toUpperCase();
      }
      break;
    }
  }

  return result;
}

// ─── POST /:id/scrape-measurements — fetch model page and extract measurements ─
router.post('/:id/scrape-measurements', async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { page_url } = req.body;
    if (!page_url) return res.status(400).json({ error: 'page_url required' });

    const html = await new Promise((resolve, reject) => {
      const client = page_url.startsWith('https') ? https : http;
      client.get(page_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
          return downloadBuffer(r.headers.location).then(b => resolve(b.toString())).catch(reject);
        if (r.statusCode !== 200) return reject(new Error(`HTTP ${r.statusCode}`));
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => resolve(Buffer.concat(chunks).toString()));
        r.on('error', reject);
      }).on('error', reject);
    });

    // Strip HTML tags to get plain text, then look for the measurement block
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    // The measurement block contains known EN labels separated by | or newlines
    // Try to find a continuous segment with at least 2 known EN labels
    const EN_PATTERN = /\b(height|chest|bust|waist|hips|size|shoes|hair|eyes|suit|shirt)\b/gi;
    const allMatches = [...plain.matchAll(EN_PATTERN)];
    if (!allMatches.length) {
      return res.status(422).json({ error: 'No measurement data found on page.' });
    }

    // Find the substring that spans from the first to last EN label match (with context)
    const first = allMatches[0].index;
    const last  = allMatches[allMatches.length - 1].index + 10;
    const block = plain.slice(Math.max(0, first - 80), last + 80);

    const parsed = parseBilingualMeasurements(block);

    if (!Object.keys(parsed).length) {
      return res.status(422).json({ error: 'Could not parse measurements from page.', block });
    }

    // Build SET clause dynamically — only update fields that were successfully parsed
    const allowed = ['height', 'bust', 'waist', 'hips', 'shoes', 'hair', 'eyes', 'torax', 'terno', 'camisa', 'manequim'];
    const updates = Object.entries(parsed).filter(([k]) => allowed.includes(k));
    if (!updates.length) return res.status(422).json({ error: 'No mappable fields found.', parsed });

    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
    const values     = updates.map(([, v]) => v);

    db.prepare(`UPDATE models SET ${setClauses} WHERE id = ?`).run(...values, req.params.id);

    const updated = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    res.json({ ok: true, parsed, updated: serializeModel(updated) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /:id/drive-import — import images from a Google Drive folder ────────
router.post('/:id/drive-import', adminAuth, async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
    if (!model) return res.status(404).json({ error: 'Not found' });

    const { folder_url, replace = false } = req.body;
    if (!folder_url) return res.status(400).json({ error: 'folder_url required' });

    // Extract folder ID from various Drive URL formats:
    // /drive/folders/{id}, /drive/u/0/folders/{id}, ?id={id}, /open?id={id}
    let folderId = null;
    const foldersMatch = folder_url.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
    const idParamMatch = folder_url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (foldersMatch)     folderId = foldersMatch[1];
    else if (idParamMatch) folderId = idParamMatch[1];
    if (!folderId) return res.status(400).json({ error: 'Não foi possível extrair o ID da pasta. Use o link completo da pasta do Google Drive.' });

    // Build auth — simple service account, no impersonation needed for Drive read
    const clientEmail  = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey   = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!clientEmail || !privateKey) {
      return res.status(500).json({ error: `Credenciais Google não configuradas no servidor. GOOGLE_CLIENT_EMAIL: ${clientEmail ? 'ok' : 'MISSING'}, GOOGLE_PRIVATE_KEY: ${privateKey ? 'ok' : 'MISSING'}` });
    }
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    await auth.authorize();

    const drive = google.drive({ version: 'v3', auth });

    // List image files in the folder
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = listRes.data.files || [];
    if (!files.length) return res.json({ ok: true, found: 0, imported: 0, errors: [] });

    // Sort by name for consistent ordering
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (replace) await clearModelImages(model.slug);

    const mediaItems = replace ? [] : JSON.parse(model.media || '[]');
    const startIndex = mediaItems.length;
    const imported = [];
    const errors   = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dlRes = await drive.files.get(
          { fileId: file.id, alt: 'media', supportsAllDrives: true },
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(dlRes.data);
        const processed = await processImageBuffer(buffer, model.slug, startIndex + i);
        mediaItems.push({ type: 'image', url: processed.full, thumb: processed.thumb, polaroid: false });
        imported.push(file.name);
      } catch (e) {
        errors.push(`${file.name}: ${e.message}`);
      }
    }

    // Rebuild cover from first image
    const coverImage = mediaItems[0]?.url || model.cover_image || null;

    db.prepare('UPDATE models SET media = ?, cover_image = ?, drive_folder_id = ? WHERE id = ?')
      .run(JSON.stringify(mediaItems), coverImage, folderId, model.id);

    const updated = db.prepare('SELECT * FROM models WHERE id = ?').get(model.id);
    res.json({ ok: true, found: files.length, imported: imported.length, errors, media: JSON.parse(updated.media || '[]') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
