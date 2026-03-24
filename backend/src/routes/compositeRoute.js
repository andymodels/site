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

// logo: tenta uploads/, depois frontend/public/, depois frontend/dist/
const POSSIBLE_LOGOS = [
  path.join(config.uploadsDir, 'logo.png'),
  path.join(__dirname, '../../../frontend/dist/logo.png'),
  path.join(__dirname, '../../../frontend/public/logo.png'),
];
const LOGO_PATH = POSSIBLE_LOGOS.find(p => fs.existsSync(p)) || null;

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
  const logoY = MARGIN + 6;
  const LOGO_H = 38;
  const NAME_X = MARGIN + 200;
  const NAME_W = W - NAME_X - MARGIN - 60; // espaço para contador à direita

  // ── logo ──────────────────────────────────────────────────────────────────
  if (LOGO_PATH) {
    doc.image(LOGO_PATH, MARGIN, logoY, { height: LOGO_H });
  } else {
    doc.fontSize(9).fillColor('#111').font('Helvetica-Bold')
      .text('ANDY MODELS', MARGIN, logoY + 12, { width: 180, lineBreak: false });
  }

  // ── nome do modelo — destaque central ────────────────────────────────────
  doc.fontSize(26).fillColor('#111').font('Helvetica-Bold')
    .text(model.name.toUpperCase(), NAME_X, logoY + 6, {
      width: NAME_W,
      align: 'center',
      lineBreak: false,
    });

  // ── contador — direita ────────────────────────────────────────────────────
  doc.fontSize(7).fillColor('#aaa').font('Helvetica')
    .text(`${pageNum} / ${totalPages}`, W - MARGIN - 55, logoY + 16, {
      width: 55,
      align: 'right',
      lineBreak: false,
    });

  // ── divisor superior ──────────────────────────────────────────────────────
  doc.moveTo(MARGIN, MARGIN + HEADER_H)
    .lineTo(W - MARGIN, MARGIN + HEADER_H)
    .lineWidth(0.4).strokeColor('#ccc').stroke();

  // ── rodapé: medidas + site ────────────────────────────────────────────────
  const footerY = H - MARGIN - FOOTER_H + 8;
  const measureStr = getMeasures(model);
  doc.fontSize(6.5).fillColor('#888').font('Helvetica')
    .text(measureStr, MARGIN, footerY, { width: W - MARGIN * 2 - 90, lineBreak: false });
  doc.fontSize(6.5).fillColor('#bbb').font('Helvetica')
    .text('andymodels.com', W - MARGIN - 90, footerY, { width: 90, align: 'right', lineBreak: false });

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

// ── POLAROID — página portrait (595 × 842), 1 foto por página ────────────────
const POL_W = 595;
const POL_H = 842;
const POL_HEADER_H = 60;
const POL_FOOTER_H = 24;
const POL_PHOTO_X = MARGIN;
const POL_PHOTO_W = POL_W - MARGIN * 2;
const POL_PHOTO_TOP = MARGIN + POL_HEADER_H + 6;
const POL_PHOTO_BOTTOM = POL_H - MARGIN - POL_FOOTER_H - 6;
const POL_PHOTO_H = POL_PHOTO_BOTTOM - POL_PHOTO_TOP;

function drawPolaroidFrame(doc, model, pageNum, totalPages) {
  const logoY = MARGIN + 6;
  const LOGO_H = 34;
  const NAME_X = MARGIN + 180;
  const NAME_W = POL_W - NAME_X - MARGIN - 50;

  if (LOGO_PATH) {
    doc.image(LOGO_PATH, MARGIN, logoY, { height: LOGO_H });
  } else {
    doc.fontSize(9).fillColor('#111').font('Helvetica-Bold')
      .text('ANDY MODELS', MARGIN, logoY + 10, { width: 160, lineBreak: false });
  }

  doc.fontSize(18).fillColor('#111').font('Helvetica-Bold')
    .text(model.name.toUpperCase(), NAME_X, logoY + 10, {
      width: NAME_W,
      align: 'center',
      lineBreak: false,
    });

  doc.fontSize(7).fillColor('#aaa').font('Helvetica')
    .text(`${pageNum} / ${totalPages}`, POL_W - MARGIN - 50, logoY + 14, {
      width: 50, align: 'right', lineBreak: false,
    });

  doc.moveTo(MARGIN, MARGIN + POL_HEADER_H)
    .lineTo(POL_W - MARGIN, MARGIN + POL_HEADER_H)
    .lineWidth(0.4).strokeColor('#ccc').stroke();

  const footerY = POL_H - MARGIN - POL_FOOTER_H + 6;
  const measureStr = getMeasures(model);
  doc.fontSize(6.5).fillColor('#888').font('Helvetica')
    .text(measureStr, MARGIN, footerY, { width: POL_W - MARGIN * 2 - 80, lineBreak: false });
  doc.fontSize(6.5).fillColor('#bbb').font('Helvetica')
    .text('andymodels.com', POL_W - MARGIN - 80, footerY, { width: 80, align: 'right', lineBreak: false });

  doc.moveTo(MARGIN, POL_H - MARGIN - POL_FOOTER_H)
    .lineTo(POL_W - MARGIN, POL_H - MARGIN - POL_FOOTER_H)
    .lineWidth(0.4).strokeColor('#ccc').stroke();
}

router.get('/:slug/polaroid.pdf', (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!model) return res.status(404).json({ error: 'Not found' });

  const urls = req.query.images
    ? req.query.images.split(',').filter(Boolean)
    : [model.cover_image].filter(Boolean);

  if (urls.length === 0) return res.status(400).json({ error: 'No images selected' });

  const filename = `polaroid_${safeFilename(model.name)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDoc({
    size: [POL_W, POL_H],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
    info: { Title: `${model.name} — Polaroid — Andy Models` },
  });
  doc.pipe(res);

  urls.forEach((url, idx) => {
    doc.addPage();
    drawPolaroidFrame(doc, model, idx + 1, urls.length);
    drawPhotoCover(doc, urlToPath(url), POL_PHOTO_X, POL_PHOTO_TOP, POL_PHOTO_W, POL_PHOTO_H);
  });

  doc.end();
});

module.exports = router;
