const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const THUMB_W        = 300;
const THUMB_H        = 400;   // 3:4 portrait, cropped
const FULL_MAX_HEIGHT = 1080;
const QUALITY        = 80;

/**
 * Process a raw image buffer into thumb (3:4 crop) + full versions.
 * Thumb: 300×400 hard-crop, gravity top (prioritises face/upper body).
 * Full:  height-capped at 1080px, proportional (no crop).
 * Never upscales images smaller than the target dimensions.
 */
async function processImageBuffer(buffer, modelSlug, index) {
  const modelDir = path.join(config.uploadsDir, 'models', modelSlug);
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });

  const idx       = String(index).padStart(2, '0');
  const thumbFile = `thumb_${idx}.jpg`;
  const fullFile  = `full_${idx}.jpg`;
  const thumbPath = path.join(modelDir, thumbFile);
  const fullPath  = path.join(modelDir, fullFile);
  const base      = `${config.uploadsUrl}/models/${modelSlug}`;

  // Thumb: exact 3:4 crop, gravity top
  const meta = await sharp(buffer).metadata();
  const srcW = meta.width || 1;
  const srcH = meta.height || 1;
  const tW = Math.min(THUMB_W, srcW);
  const tH = Math.min(THUMB_H, srcH);

  await sharp(buffer)
    .resize(tW, tH, { fit: 'cover', position: 'top', withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true })
    .toFile(thumbPath);

  // Full: proportional, height-capped
  await sharp(buffer)
    .resize({ height: FULL_MAX_HEIGHT, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: QUALITY, progressive: true })
    .toFile(fullPath);

  return {
    thumb: `${base}/${thumbFile}`,
    full:  `${base}/${fullFile}`,
  };
}

/**
 * Delete all previously processed thumb/full images for a model slug.
 * Call this before re-syncing a model to avoid file accumulation.
 */
function clearModelImages(modelSlug) {
  const modelDir = path.join(config.uploadsDir, 'models', modelSlug);
  if (!fs.existsSync(modelDir)) return;
  fs.readdirSync(modelDir)
    .filter(f => /^(thumb|full)_\d+\.jpg$/.test(f))
    .forEach(f => {
      try { fs.unlinkSync(path.join(modelDir, f)); } catch {}
    });
}

/**
 * Derive the thumb URL from a full URL produced by this processor.
 * Returns null if the URL doesn't match the expected pattern.
 */
function thumbFromFull(fullUrl) {
  if (!fullUrl) return null;
  return fullUrl.includes('/full_') ? fullUrl.replace('/full_', '/thumb_') : null;
}

module.exports = { processImageBuffer, clearModelImages, thumbFromFull };
