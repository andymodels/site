#!/usr/bin/env node
/**
 * Percorre todos os modelos: identifica URLs full_* locais em cover_image, images e media[].url,
 * envia cada ficheiro único uma vez para o B2, atualiza media (e cover_image / images alinhados).
 * media[].thumb não é alterado.
 *
 * Executar manualmente: node backend/scripts/migrateModelImagesToB2.js
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/db');
const config = require('../src/config');
const storage = require('../src/services/storage');

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

/** Recolhe paths relativos únicos (full_*, ficheiro existente) por modelo. */
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

  if (row.cover_image?.trim()) addUrl(row.cover_image.trim());

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

function originalnameForSave(absPath) {
  const base = path.basename(absPath);
  if (base && base !== '.') return `migrate-${base}`;
  return 'migrate-image.jpg';
}

function applyRelMapToRow(row, relToNewUrl) {
  let cover = row.cover_image;
  if (cover != null && String(cover).trim() !== '') {
    const rel = toRel(String(cover).trim());
    if (rel && relToNewUrl.has(rel)) cover = relToNewUrl.get(rel);
  }

  let media = [];
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

  let imagesArr = [];
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

  return {
    cover_image: cover,
    media: JSON.stringify(media),
    images: JSON.stringify(imagesArr),
  };
}

async function main() {
  const allRows = db.prepare('SELECT id, slug, cover_image, images, media FROM models ORDER BY id').all();

  const globalRelSet = new Set();
  for (const row of allRows) {
    for (const rel of collectFullRels(row)) {
      globalRelSet.add(rel);
    }
  }

  console.log('[migrateModelImagesToB2] Modelos na base:', allRows.length);
  console.log('[migrateModelImagesToB2] Ficheiros full_* únicos (global):', globalRelSet.size);
  console.log('[migrateModelImagesToB2] UPLOADS_DIR:', config.uploadsDir);

  const relToNewUrl = new Map();

  if (globalRelSet.size > 0) {
    for (const rel of globalRelSet) {
      const { buffer, absPath } = readUploadsFile(rel);
      const originalname = originalnameForSave(absPath);
      const newUrl = await storage.saveFile({ buffer, originalname });
      relToNewUrl.set(rel, newUrl);
      console.log('[migrateModelImagesToB2]', rel, '→', newUrl);
    }
  }

  const updStmt = db.prepare(
    'UPDATE models SET cover_image = ?, images = ?, media = ? WHERE id = ?'
  );

  let modelsProcessed = 0;
  for (const row of allRows) {
    const { cover_image, images, media } = applyRelMapToRow(row, relToNewUrl);
    updStmt.run(
      cover_image == null ? null : cover_image,
      images,
      media,
      row.id
    );
    modelsProcessed += 1;
  }

  const totalImagensEnviadas = relToNewUrl.size;

  console.log('[migrateModelImagesToB2] ——');
  console.log('[migrateModelImagesToB2] Total de modelos processados:', modelsProcessed);
  console.log('[migrateModelImagesToB2] Total de imagens enviadas:', totalImagensEnviadas);
}

main().catch((e) => {
  console.error('[migrateModelImagesToB2] Erro:', e.message);
  process.exit(1);
});
