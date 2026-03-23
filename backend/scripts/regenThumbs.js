/**
 * Regenerate all thumb_NN.jpg files with the new 3:4 crop from existing full_NN.jpg.
 * Run: node scripts/regenThumbs.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs      = require('fs');
const path    = require('path');
const sharp   = require('sharp');
const db      = require('../src/db');
const config  = require('../src/config');

const THUMB_W = 300;
const THUMB_H = 400;
const QUALITY = 80;

async function regenThumb(thumbPath, fullPath) {
  const buffer = fs.readFileSync(fullPath);
  const meta   = await sharp(buffer).metadata();
  const tW     = Math.min(THUMB_W, meta.width  || THUMB_W);
  const tH     = Math.min(THUMB_H, meta.height || THUMB_H);

  await sharp(buffer)
    .resize(tW, tH, { fit: 'cover', position: 'top', withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true })
    .toFile(thumbPath);
}

async function main() {
  const models = db.prepare('SELECT id, name, slug, cover_image, cover_thumb FROM models').all();
  console.log(`Regenerando thumbs para ${models.length} modelos...`);

  let ok = 0, skipped = 0, errors = 0;

  for (const m of models) {
    const modelDir = path.join(config.uploadsDir, 'models', m.slug);
    if (!fs.existsSync(modelDir)) { skipped++; continue; }

    const files = fs.readdirSync(modelDir).filter(f => /^full_\d+\.jpg$/.test(f)).sort();
    if (files.length === 0) { skipped++; continue; }

    for (const fullFile of files) {
      const thumbFile = fullFile.replace('full_', 'thumb_');
      const fullPath  = path.join(modelDir, fullFile);
      const thumbPath = path.join(modelDir, thumbFile);
      try {
        await regenThumb(thumbPath, fullPath);
      } catch (e) {
        console.error(`  ERRO ${m.slug}/${fullFile}: ${e.message}`);
        errors++;
      }
    }

    // Update cover_thumb URL in DB
    const firstFull  = files[0];
    const firstThumb = firstFull.replace('full_', 'thumb_');
    const base       = `${config.uploadsUrl}/models/${m.slug}`;
    const newThumb   = `${base}/${firstThumb}`;

    db.prepare('UPDATE models SET cover_thumb=? WHERE id=?').run(newThumb, m.id);
    ok++;
    process.stdout.write(`\r  ${ok}/${models.length} modelos processados`);
  }

  console.log(`\nConcluído: ${ok} ok, ${skipped} sem arquivos, ${errors} erros`);
}

main().catch(e => { console.error(e); process.exit(1); });
