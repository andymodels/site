const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const http    = require('http');
const https   = require('https');
const { URL } = require('url');
const db      = require('../db');
const config  = require('../config');
const PDFDoc  = require('pdfkit');

// ── helpers ───────────────────────────────────────────────────────────────────
function urlToPath(url) {
  if (!url) return null;
  const rel = url.replace(/^\/uploads\//, '');
  return path.join(config.uploadsDir, rel);
}

/** URLs a partir de model.media: só type === 'image', ordem preservada, sempre item.url */
function urlsFromMedia(model, polaroidOnly) {
  try {
    const media = JSON.parse(model.media || '[]');
    if (!Array.isArray(media)) return [];
    return media
      .filter((m) => m && m.type === 'image' && m.url && String(m.url).trim())
      .filter((m) => !polaroidOnly || m.polaroid === true)
      .map((m) => String(m.url).trim());
  } catch {
    return [];
  }
}

function parseQueryImages(q) {
  if (q == null || q === '') return null;
  const s = String(q).trim();
  if (!s) return null;
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

/** Download HTTP(S) → Buffer (redirects seguidos). */
function downloadUrlToBuffer(imageUrl) {
  return new Promise((resolve) => {
    const u = String(imageUrl).trim();
    if (!/^https?:\/\//i.test(u)) {
      resolve(null);
      return;
    }
    const lib = u.startsWith('https') ? https : http;
    const req = lib.get(
      u,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AndyModels-PDF/1.0)' } },
      (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, u).href;
          downloadUrlToBuffer(next).then(resolve);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const ct = (res.headers['content-type'] || '').toLowerCase();
        if (ct.includes('text/html')) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve(buf.length ? buf : null);
        });
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(45000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Local /uploads/… → buffer; https? → download; resto → null
 */
async function resolveImageBuffer(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  if (u.startsWith('/uploads/')) {
    const p = urlToPath(u);
    if (p && fs.existsSync(p)) {
      try {
        return fs.readFileSync(p);
      } catch {
        return null;
      }
    }
    return null;
  }
  if (/^https?:\/\//i.test(u)) {
    return downloadUrlToBuffer(u);
  }
  return null;
}

function safeFilename(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
}

const POSSIBLE_LOGOS = [
  path.join(config.uploadsDir, 'logo.png'),
  path.join(__dirname, '../../../frontend/dist/logo.png'),
  path.join(__dirname, '../../../frontend/public/logo.png'),
];
const LOGO_PATH = POSSIBLE_LOGOS.find((p) => fs.existsSync(p)) || null;

function getMeasures(model) {
  const cats = (() => {
    try {
      return JSON.parse(model.categories || '[]');
    } catch {
      return [];
    }
  })();
  const isMen = cats.includes('men') || model.category === 'men';

  const womenFields = [
    ['height', 'Height'],
    ['bust', 'Bust'],
    ['waist', 'Waist'],
    ['hips', 'Hips'],
    ['manequim', 'Size'],
    ['shoes', 'Shoes'],
    ['hair', 'Hair'],
    ['eyes', 'Eyes'],
  ];
  const menFields = [
    ['height', 'Height'],
    ['torax', 'Chest'],
    ['terno', 'Suit'],
    ['camisa', 'Shirt'],
    ['manequim', 'Size'],
    ['shoes', 'Shoes'],
    ['hair', 'Hair'],
    ['eyes', 'Eyes'],
  ];

  const fields = isMen ? menFields : womenFields;
  return fields
    .filter(([k]) => model[k] && String(model[k]).trim())
    .map(([k, l]) => `${l.toUpperCase()} ${model[k]}`)
    .join(' | ');
}

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 38;
const HEADER_H = 64;
const FOOTER_H = 26;
const GAP = 14;

const PHOTO_AREA_TOP = MARGIN + HEADER_H + 8;
const PHOTO_AREA_BOTTOM = PAGE_H - MARGIN - FOOTER_H - 8;
const PHOTO_H = PHOTO_AREA_BOTTOM - PHOTO_AREA_TOP;
const PHOTO_W = (PAGE_W - MARGIN * 2 - GAP) / 2;

function drawPageFrame(doc, model, pageNum, totalPages) {
  const W = PAGE_W;
  const H = PAGE_H;
  const logoY = MARGIN + 6;
  const LOGO_H = 38;

  if (LOGO_PATH) {
    doc.image(LOGO_PATH, MARGIN, logoY, { height: LOGO_H });
  } else {
    doc.fontSize(9).fillColor('#111').font('Helvetica-Bold').text('ANDY MODELS', MARGIN, logoY + 12, { width: 180, lineBreak: false });
  }

  doc.fontSize(24).fillColor('#111').font('Helvetica-Bold').text(model.name.toUpperCase(), MARGIN, logoY + 6, {
    width: W - MARGIN * 2,
    align: 'center',
    lineBreak: false,
  });

  doc.fontSize(7).fillColor('#aaa').font('Helvetica').text(`${pageNum} / ${totalPages}`, W - MARGIN - 55, logoY + 16, {
    width: 55,
    align: 'right',
    lineBreak: false,
  });

  doc.moveTo(MARGIN, MARGIN + HEADER_H).lineTo(W - MARGIN, MARGIN + HEADER_H).lineWidth(0.4).strokeColor('#ccc').stroke();

  const footerY = H - MARGIN - FOOTER_H + 8;
  const measureStr = getMeasures(model);
  doc.fontSize(6.5).fillColor('#888').font('Helvetica').text(measureStr, MARGIN, footerY, { width: W - MARGIN * 2 - 90, lineBreak: false });
  doc.fontSize(6.5).fillColor('#bbb').font('Helvetica').text('andymodels.com', W - MARGIN - 90, footerY, { width: 90, align: 'right', lineBreak: false });

  doc.moveTo(MARGIN, H - MARGIN - FOOTER_H).lineTo(W - MARGIN, H - MARGIN - FOOTER_H).lineWidth(0.4).strokeColor('#ccc').stroke();
}

/** PDFKit aceita path ou Buffer */
function drawPhotoCover(doc, imageBuffer, x, y, w, h) {
  doc.rect(x, y, w, h).fillColor('#f5f5f5').fill();

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    doc.rect(x, y, w, h).lineWidth(0.3).strokeColor('#e0e0e0').stroke();
    return;
  }

  try {
    doc.image(imageBuffer, x, y, {
      fit: [w, h],
      align: 'center',
      valign: 'center',
    });
  } catch {
    doc.rect(x, y, w, h).lineWidth(0.3).strokeColor('#e0e0e0').stroke();
  }
}

async function buildPdfPairs(urls) {
  const buffers = await Promise.all(urls.map((u) => resolveImageBuffer(u)));
  const pairs = [];
  for (let i = 0; i < buffers.length; i += 2) {
    pairs.push([buffers[i], buffers[i + 1] || null]);
  }
  return pairs;
}

// ── COMPOSITE ─────────────────────────────────────────────────────────────────
router.get('/:slug/composite.pdf', async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE slug = ? AND active = 1').get(req.params.slug);
    if (!model) return res.status(404).json({ error: 'Not found' });

    let urls = parseQueryImages(req.query.images);
    if (!urls || urls.length === 0) {
      urls = urlsFromMedia(model, false);
    }

    if (urls.length === 0) return res.status(400).json({ error: 'No images selected' });

    const pairs = await buildPdfPairs(urls);

    const filename = `composite_${safeFilename(model.name)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDoc({
      size: [PAGE_W, PAGE_H],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: false,
      info: { Title: `${model.name} — Composite — Andy Models` },
    });
    doc.pipe(res);

    pairs.forEach(([bufA, bufB], idx) => {
      doc.addPage();
      drawPageFrame(doc, model, idx + 1, pairs.length);

      if (bufB) {
        drawPhotoCover(doc, bufA, MARGIN, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
        drawPhotoCover(doc, bufB, MARGIN + PHOTO_W + GAP, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
      } else {
        const singleX = (PAGE_W - PHOTO_W) / 2;
        drawPhotoCover(doc, bufA, singleX, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
      }
    });

    doc.end();
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || 'PDF error' });
    }
  }
});

// ── POLAROID ──────────────────────────────────────────────────────────────────
router.get('/:slug/polaroid.pdf', async (req, res) => {
  try {
    const model = db.prepare('SELECT * FROM models WHERE slug = ? AND active = 1').get(req.params.slug);
    if (!model) return res.status(404).json({ error: 'Not found' });

    let urls = parseQueryImages(req.query.images);
    if (!urls || urls.length === 0) {
      urls = urlsFromMedia(model, true);
    }

    if (urls.length === 0) return res.status(400).json({ error: 'No images selected' });

    const pairs = await buildPdfPairs(urls);
    const totalPages = pairs.length;

    const filename = `polaroid_${safeFilename(model.name)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDoc({
      size: [PAGE_W, PAGE_H],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: false,
      info: { Title: `${model.name} — Polaroid — Andy Models` },
    });
    doc.pipe(res);

    pairs.forEach(([bufA, bufB], idx) => {
      doc.addPage();
      drawPageFrame(doc, model, idx + 1, totalPages);
      if (bufB) {
        drawPhotoCover(doc, bufA, MARGIN, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
        drawPhotoCover(doc, bufB, MARGIN + PHOTO_W + GAP, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
      } else {
        const singleX = (PAGE_W - PHOTO_W) / 2;
        drawPhotoCover(doc, bufA, singleX, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
      }
    });

    doc.end();
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || 'PDF error' });
    }
  }
});

module.exports = router;
