#!/usr/bin/env node
/**
 * Modelo TARGET_SLUG: para cada imagem full_* em media[].url e em images[],
 * envia o ficheiro local a B2 (uma vez por path único) e substitui só as URLs full.
 * media[i].thumb não é alterado.
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/db');
const config = require('../src/config');
const storage = require('../src/services/storage');

const TARGET_SLUG = 'bea-estevam';

function readUploadsFile(relativeFromUploadsRoot) {
  const fp = path.join(config.uploadsDir, relativeFromUploadsRoot);
  if (!fs.existsSync(fp)) {
    throw new Error(`Ficheiro não encontrado em uploads: ${fp}`);
  }
  return { buffer: fs.readFileSync(fp), absPath: fp };
}

function isFullImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const base = path.basename(url.split('?')[0]).toLowerCase();
  if (base.includes('thumb_')) return false;
  return base.includes('full_');
}

function toRel(url) {
  const u = String(url).trim();
  if (!u.startsWith('/uploads/')) return null;
  return u.replace(/^\/uploads\/?/, '');
}

/** Recolhe paths relativos únicos (full_*, ficheiro existente) a partir de media e images. */
function collectFullRels(row) {
  const relSet = new Set();

  function addUrl(u) {
    if (!u) return;
    const t = String(u).trim();
    if (!isFullImageUrl(t)) return;
    const rel = toRel(t);
    if (!rel) return;
    const fp = path.join(config.uploadsDir, rel);
    if (fs.existsSync(fp)) relSet.add(rel);
  }

  try {
    const media = JSON.parse(row.media || '[]');
    if (Array.isArray(media)) {
      for (const item of media) {
        if (item.type === 'video') continue;
        if (item.type && item.type !== 'image') continue;
        if (item.url) addUrl(item.url);
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const imgs = JSON.parse(row.images || '[]');
    if (Array.isArray(imgs)) {
      for (const u of imgs) {
        if (u) addUrl(u);
      }
    }
  } catch {
    /* ignore */
  }

  return relSet;
}

function originalnameForSave(absPath, slug) {
  const base = path.basename(absPath);
  if (base && base !== '.') return `${slug}-${base}`;
  return `${slug}-image.jpg`;
}

async function main() {
  const row = db
    .prepare(`SELECT id, slug, images, media FROM models WHERE slug = ?`)
    .get(TARGET_SLUG);

  if (!row) {
    console.error(`[migrateModelImagesToB2] Modelo não encontrado: slug="${TARGET_SLUG}"`);
    process.exit(1);
  }

  const relSet = collectFullRels(row);
  if (relSet.size === 0) {
    console.error(
      `[migrateModelImagesToB2] Nenhuma imagem full_* local (/uploads/...) em media ou images para slug="${TARGET_SLUG}".`
    );
    process.exit(1);
  }

  console.log('[migrateModelImagesToB2] Modelo:', { id: row.id, slug: row.slug });
  console.log('[migrateModelImagesToB2] Ficheiros full_* únicos a enviar:', relSet.size);

  const relToNewUrl = new Map();
  for (const rel of relSet) {
    const { buffer, absPath } = readUploadsFile(rel);
    const originalname = originalnameForSave(absPath, row.slug);
    const newUrl = await storage.saveFile({ buffer, originalname });
    relToNewUrl.set(rel, newUrl);
    console.log('[migrateModelImagesToB2]', rel, '→', newUrl);
  }

  let media;
  try {
    media = JSON.parse(row.media || '[]');
  } catch {
    media = [];
  }
  if (!Array.isArray(media)) media = [];

  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    if (item.type === 'video') continue;
    if (item.type && item.type !== 'image') continue;
    if (!item.url) continue;
    const rel = toRel(String(item.url).trim());
    if (rel && relToNewUrl.has(rel)) {
      item.url = relToNewUrl.get(rel);
    }
  }

  let imagesArr;
  try {
    imagesArr = JSON.parse(row.images || '[]');
  } catch {
    imagesArr = [];
  }
  if (!Array.isArray(imagesArr)) imagesArr = [];

  for (let j = 0; j < imagesArr.length; j++) {
    const u = imagesArr[j];
    if (u == null || u === '') continue;
    const rel = toRel(String(u).trim());
    if (rel && relToNewUrl.has(rel)) {
      imagesArr[j] = relToNewUrl.get(rel);
    }
  }

  const upd = db
    .prepare('UPDATE models SET media = ?, images = ? WHERE slug = ?')
    .run(JSON.stringify(media), JSON.stringify(imagesArr), TARGET_SLUG);

  console.log('[migrateModelImagesToB2] UPLOADS_DIR:', config.uploadsDir);
  console.log('[migrateModelImagesToB2] thumbs em media inalterados; linhas alteradas:', upd.changes);
}

main().catch((e) => {
  console.error('[migrateModelImagesToB2] Erro:', e.message);
  process.exit(1);
});
