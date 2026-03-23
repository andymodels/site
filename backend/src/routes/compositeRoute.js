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

const MEASURES_DEF = [
  ['height', 'Height'], ['bust', 'Bust'], ['waist', 'Waist'],
  ['hips', 'Hips'], ['shoes', 'Shoes'], ['eyes', 'Eyes'], ['hair', 'Hair'],
];

function buildMeasureString(model) {
  return MEASURES_DEF
    .filter(([k]) => model[k])
    .map(([k, l]) => `${l.toUpperCase()} ${model[k]}`)
    .join('   ');
}

// ── Page layout constants (A4 Landscape: 842 × 595 pt) ───────────────────────
const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 38;
const HEADER_H = 52;   // top bar height
const FOOTER_H = 22;   // bottom bar height
const GAP     = 14;    // gap between the two photos

// photo area
const PHOTO_AREA_TOP    = MARGIN + HEADER_H + 8;
const PHOTO_AREA_BOTTOM = PAGE_H - MARGIN - FOOTER_H - 8;
const PHOTO_H = PHOTO_AREA_BOTTOM - PHOTO_AREA_TOP;
const PHOTO_W = (PAGE_W - MARGIN * 2 - GAP) / 2;

function drawPageFrame(doc, model, pageNum, totalPages) {
  const W = doc.page.width;
  const H = doc.page.height;

  // ── top bar ────────────────────────────────────────────────
  const logoY = MARGIN + 6;
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN, logoY, { height: 22 });
  } else {
    doc.fontSize(9).fillColor('#111').font('Helvetica-Bold')
      .text('ANDY MODELS', MARGIN, logoY + 6, { width: 150 });
  }

  // model name — centered
  doc.fontSize(8).fillColor('#111').font('Helvetica-Bold')
    .text(model.name.toUpperCase(), MARGIN + 160, logoY + 4, {
      width: W - (MARGIN + 160) * 2,
      align: 'center',
    });

  // page counter — right
  doc.fontSize(6.5).fillColor('#aaa').font('Helvetica')
    .text(`${pageNum} / ${totalPages}`, W - MARGIN - 50, logoY + 6, { width: 50, align: 'right' });

  // divider
  doc.moveTo(MARGIN, MARGIN + HEADER_H)
    .lineTo(W - MARGIN, MARGIN + HEADER_H)
    .lineWidth(0.4).strokeColor('#ccc').stroke();

  // ── bottom bar ─────────────────────────────────────────────
  const footerY = H - MARGIN - FOOTER_H + 6;

  // measurements
  const measureStr = buildMeasureString(model);
  doc.fontSize(6).fillColor('#888').font('Helvetica')
    .text(measureStr, MARGIN, footerY, { width: W - MARGIN * 2 - 80 });

  // website right
  doc.fontSize(6).fillColor('#bbb').font('Helvetica')
    .text('andymodels.com', W - MARGIN - 80, footerY, { width: 80, align: 'right' });

  // divider
  doc.moveTo(MARGIN, H - MARGIN - FOOTER_H)
    .lineTo(W - MARGIN, H - MARGIN - FOOTER_H)
    .lineWidth(0.4).strokeColor('#ccc').stroke();
}

function drawPhoto(doc, localPath, x, y, w, h) {
  // White background box always
  doc.rect(x, y, w, h).fillColor('#ffffff').fill();

  if (!localPath || !fs.existsSync(localPath)) {
    doc.rect(x, y, w, h).lineWidth(0.4).strokeColor('#e8e8e8').stroke();
    return;
  }

  try {
    // contain: fit entire image inside box, no crop, white bg
    doc.image(localPath, x, y, {
      fit:   [w, h],
      align: 'center',
      valign: 'center',
    });
  } catch (e) {
    doc.rect(x, y, w, h).lineWidth(0.4).strokeColor('#e8e8e8').stroke();
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

  // group into pairs for 2-per-page layout
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
      // Two photos side by side
      drawPhoto(doc, pathA, MARGIN,                      PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
      drawPhoto(doc, pathB, MARGIN + PHOTO_W + GAP,      PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
    } else {
      // Single photo — centred
      const singleX = (PAGE_W - PHOTO_W) / 2;
      drawPhoto(doc, pathA, singleX, PHOTO_AREA_TOP, PHOTO_W, PHOTO_H);
    }
  });

  doc.end();
});

// ── POLAROID ──────────────────────────────────────────────────────────────────
// A5 portrait per photo — clean editorial polaroid style
const POL_W = 420;
const POL_H = 595;
const POL_MARGIN = 28;
const POL_PHOTO_W = POL_W - POL_MARGIN * 2;
const POL_PHOTO_H = Math.round(POL_PHOTO_W * (4 / 3));

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

  urls.forEach(url => {
    doc.addPage();

    const localPath = urlToPath(url);
    const photoTop  = POL_MARGIN;

    // photo frame (white background with subtle shadow via rect)
    doc.rect(POL_MARGIN - 2, photoTop - 2, POL_PHOTO_W + 4, POL_PHOTO_H + 4)
      .fillColor('#f0f0f0').fill();

    drawPhoto(doc, localPath, POL_MARGIN, photoTop, POL_PHOTO_W, POL_PHOTO_H);

    // model name below
    const nameY = photoTop + POL_PHOTO_H + 18;
    doc.fontSize(10).fillColor('#111').font('Helvetica-Bold')
      .text(model.name.toUpperCase(), POL_MARGIN, nameY, {
        width: POL_PHOTO_W,
        align: 'center',
      });

    // measurements compact
    const mStr = buildMeasureString(model);
    if (mStr) {
      doc.fontSize(6).fillColor('#999').font('Helvetica')
        .text(mStr, POL_MARGIN, nameY + 16, { width: POL_PHOTO_W, align: 'center' });
    }

    // agency footer
    const footY = POL_H - POL_MARGIN - 10;
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, (POL_W - 70) / 2, footY - 14, { height: 12 });
    } else {
      doc.fontSize(6).fillColor('#bbb').font('Helvetica')
        .text('ANDY MODELS', POL_MARGIN, footY, { width: POL_PHOTO_W, align: 'center' });
    }
  });

  doc.end();
});

module.exports = router;
