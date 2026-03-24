const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const config  = require('../config');
const PDFDoc  = require('pdfkit');

// ── helpers ───────────────────────────────────────────────────────────────────
function urlToPath(url) {
  if (!url) return null;
  const rel = url.replace(/^\/uploads\//, '');
  return path.join(config.uploadsDir, rel);
}

function safeFilename(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
}

const LOGO_PATH = path.join(config.uploadsDir, 'logo.png');

function getMeasures(model) {
  const cats = (() => { try { return JSON.parse(model.categories || '[]'); } catch { return []; } })();
  const isMen = cats.includes('men') || model.category === 'men';
  if (isMen) {
    return [
      ['height', 'Height'], ['torax', 'Chest'], ['terno', 'Suit'],
      ['camisa', 'Shirt'], ['manequim', 'Size'], ['shoes', 'Shoes'],
    ].filter(([k]) => model[k]).map(([k, l]) => `${l.toUpperCase()} ${model[k]}`).join('   ');
  }
  return [
    ['height', 'Height'], ['bust', 'Bust'], ['waist', 'Waist'],
    ['hips', 'Hips'], ['manequim', 'Size'], ['shoes', 'Shoes'],
  ].filter(([k]) => model[k]).map(([k, l]) => `${l.toUpperCase()} ${model[k]}`).join('   ');
}

// ── Page layout constants (A4 Landscape: 842 × 595 pt) ───────────────────────
const PAGE_W  = 842;
const PAGE_H  = 595;
const MARGIN  = 38;
const HEADER_H = 64;
const FOOTER_H = 26;
const GAP     = 14;

const PHOTO_AREA_TOP    = MARGIN + HEADER_H + 8;
const PHOTO_AREA_BOTTOM = PAGE_H - MARGIN - FOOTER_H - 8;
const PHOTO_H = PHOTO_AREA_BOTTOM - PHOTO_AREA_TOP;
const PHOTO_W = (PAGE_W - MARGIN * 2 - GAP) / 2;

function drawPageFrame(doc, model, pageNum, totalPages) {
  const W = PAGE_W;
  const H = PAGE_H;
  const logoY = MARGIN + 8;

  // logo
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN, logoY, { height: 32 });
  } else {
    doc.fontSize(10).fillColor('#111').font('Helvetica-Bold')
      .text('ANDY MODELS', MARGIN, logoY + 8, { width: 160 });
  }

  // model name — large, centered, dominant
  doc.fontSize(20).fillColor('#111').font('Helvetica-Bold')
    .text(model.name.toUpperCase(), MARGIN + 180, logoY + 4, {
      width: W - (MARGIN + 180) * 2,
      align: 'center',
      lineBreak: false,
    });

  // page counter — right
  doc.fontSize(7).fillColor('#aaa').font('Helvetica')
    .text(`${pageNum} / ${totalPages}`, W - MARGIN - 50, logoY + 14, { width: 50, align: 'right' });

  // top divider
  doc.moveTo(MARGIN, MARGIN + HEADER_H)
    .lineTo(W - MARGIN, MARGIN + HEADER_H)
    .lineWidth(0.4).strokeColor('#ccc').stroke();

  // footer
  const footerY = H - MARGIN - FOOTER_H + 8;
  const measureStr = getMeasures(model);
  doc.fontSize(6.5).fillColor('#888').font('Helvetica')
    .text(measureStr, MARGIN, footerY, { width: W - MARGIN * 2 - 90 });
  doc.fontSize(6.5).fillColor('#bbb').font('Helvetica')
    .text('andymodels.com', W - MARGIN - 90, footerY, { width: 90, align: 'right' });

  doc.moveTo(MARGIN, H - MARGIN - FOOTER_H)
    .lineTo(W - MARGIN, H - MARGIN - FOOTER_H)
    .lineWidth(0.4).strokeColor('#ccc').stroke();
}

// cover-crop: fill bounding box, clip to edges — no distortion, no whitespace
function drawPhotoCover(doc, localPath, x, y, w, h) {
  doc.rect(x, y, w, h).fillColor('#f5f5f5').fill();

  if (!localPath || !fs.existsSync(localPath)) {
    doc.rect(x, y, w, h).lineWidth(0.3).strokeColor('#e0e0e0').stroke();
    return;
  }

  try {
    doc.save();
    doc.rect(x, y, w, h).clip();
    doc.image(localPath, x, y, {
      cover: [w, h],
      align: 'center',
      valign: 'top',
    });
    doc.restore();
  } catch {
    doc.rect(x, y, w, h).lineWidth(0.3).strokeColor('#e0e0e0').stroke();
  }
}

// ── COMPOSITE ─────────────────────────────────────────────────────────────────
router.get('/:slug/composite.pdf', (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!model) return res.status(404).json({ error: 'Not found' });

  const urls = req.query.images
    ? req.query.images.split(',').filter(Boolean)
    : [model.cover_image].filter(Boolean);

  if (urls.length === 0) return res.status(400).json({ error: 'No images selected' });

  const pairs = [];
  for (let i = 0; i < urls.length; i += 2) {
    pairs.push([urls[i], urls[i + 1] || null]);
  }

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

  pairs.forEach(([urlA, urlB], idx) => {
    doc.addPage();
    drawPageFrame(doc, model, idx + 1, pairs.length);

    const pathA = urlToPath(urlA);
    const pathB = urlB ? urlToPath(urlB) : null;

    if (pathB) {
      drawPhotoCover(doc, pathA, MARGIN,                 PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
      drawPhotoCover(doc, pathB, MARGIN + PHOTO_W + GAP, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
    } else {
      const singleX = (PAGE_W - PHOTO_W) / 2;
      drawPhotoCover(doc, pathA, singleX, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
    }
  });

  doc.end();
});

// ── POLAROID — mesmo template do composite ────────────────────────────────────
router.get('/:slug/polaroid.pdf', (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!model) return res.status(404).json({ error: 'Not found' });

  const urls = req.query.images
    ? req.query.images.split(',').filter(Boolean)
    : [model.cover_image].filter(Boolean);

  if (urls.length === 0) return res.status(400).json({ error: 'No images selected' });

  // polaroid: 1 foto por página, centrada — mesma estrutura do composite
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

  urls.forEach((url, idx) => {
    doc.addPage();
    drawPageFrame(doc, model, idx + 1, urls.length);

    // single photo centred — uses full width of both photo columns
    const fullW = PHOTO_W * 2 + GAP;
    const singleX = (PAGE_W - fullW) / 2;
    drawPhotoCover(doc, urlToPath(url), singleX, PHOTO_AREA_TOP, fullW, PHOTO_H);
  });

  doc.end();
});

module.exports = router;
