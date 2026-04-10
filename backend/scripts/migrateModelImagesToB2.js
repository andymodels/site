#!/usr/bin/env node
/**
 * Um único modelo (TARGET_SLUG): lê imagem de uploads/ no disco,
 * grava via storage.saveFile, atualiza media[0].url (e thumb se existir) com a nova URL.
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/db');
const config = require('../src/config');
const storage = require('../src/services/storage');

/** Slug do modelo a processar (editar aqui). */
const TARGET_SLUG = 'bea-estevam';

function readUploadsFile(relativeFromUploadsRoot) {
  const fp = path.join(config.uploadsDir, relativeFromUploadsRoot);
  if (!fs.existsSync(fp)) {
    throw new Error(`Ficheiro não encontrado em uploads: ${fp}`);
  }
  return { buffer: fs.readFileSync(fp), absPath: fp };
}

/**
 * Preferência: cover_image com caminho /uploads/... existente;
 * senão primeira URL em `images` ou `media` (imagem) que aponte a um ficheiro existente em disco.
 */
function pickLocalUploadsSource(row) {
  const candidates = [];

  if (row.cover_image?.trim()) {
    candidates.push({ label: 'cover_image', url: row.cover_image.trim() });
  }
  if (row.cover_thumb?.trim()) {
    candidates.push({ label: 'cover_thumb', url: row.cover_thumb.trim() });
  }

  try {
    const imgs = JSON.parse(row.images || '[]');
    if (Array.isArray(imgs)) {
      imgs.forEach((u, i) => {
        if (u) candidates.push({ label: `images[${i}]`, url: String(u).trim() });
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const media = JSON.parse(row.media || '[]');
    if (Array.isArray(media)) {
      media.forEach((item, i) => {
        if (item.type === 'video') return;
        if (item.type && item.type !== 'image') return;
        if (item.url) candidates.push({ label: `media[${i}].url`, url: String(item.url).trim() });
        if (item.thumb) candidates.push({ label: `media[${i}].thumb`, url: String(item.thumb).trim() });
      });
    }
  } catch {
    /* ignore */
  }

  for (const { label, url } of candidates) {
    if (!url.startsWith('/uploads/')) continue;
    const rel = url.replace(/^\/uploads\/?/, '');
    const fp = path.join(config.uploadsDir, rel);
    if (fs.existsSync(fp)) {
      return { label, url, rel };
    }
  }

  return null;
}

function originalnameForSave(absPath, slug) {
  const base = path.basename(absPath);
  if (base && base !== '.') return `${slug}-${base}`;
  return `${slug}-image.jpg`;
}

async function main() {
  const row = db
    .prepare(
      `SELECT id, slug, cover_image, cover_thumb, images, media FROM models WHERE slug = ?`
    )
    .get(TARGET_SLUG);

  if (!row) {
    console.error(`[migrateModelImagesToB2] Modelo não encontrado: slug="${TARGET_SLUG}"`);
    process.exit(1);
  }

  const picked = pickLocalUploadsSource(row);
  if (!picked) {
    console.error(
      `[migrateModelImagesToB2] Nenhuma imagem local (/uploads/... com ficheiro existente) para slug="${TARGET_SLUG}".`
    );
    process.exit(1);
  }

  console.log('[migrateModelImagesToB2] Modelo:', { id: row.id, slug: row.slug });
  console.log('[migrateModelImagesToB2] Origem:', picked.label, '→', picked.url);

  const { buffer, absPath } = readUploadsFile(picked.rel);
  const originalname = originalnameForSave(absPath, row.slug);
  const newUrl = await storage.saveFile({ buffer, originalname });

  let media;
  try {
    media = JSON.parse(row.media || '[]');
  } catch {
    media = [];
  }
  if (!Array.isArray(media) || media.length === 0) {
    console.error(
      `[migrateModelImagesToB2] model.media vazio ou inválido — é necessário pelo menos media[0] (slug="${TARGET_SLUG}").`
    );
    process.exit(1);
  }

  const m0 = media[0];
  if (m0.type === 'video') {
    console.error('[migrateModelImagesToB2] media[0] é vídeo; esperado primeiro item de imagem.');
    process.exit(1);
  }

  m0.url = newUrl;
  if (m0.thumb != null && String(m0.thumb).trim() !== '') {
    m0.thumb = newUrl;
  }

  const upd = db.prepare('UPDATE models SET media = ? WHERE slug = ?').run(JSON.stringify(media), TARGET_SLUG);

  console.log('[migrateModelImagesToB2] UPLOADS_DIR:', config.uploadsDir);
  console.log('[migrateModelImagesToB2] Nova URL (storage.saveFile):', newUrl);
  console.log('[migrateModelImagesToB2] media[0] atualizado no banco (linhas alteradas):', upd.changes);
}

main().catch((e) => {
  console.error('[migrateModelImagesToB2] Erro:', e.message);
  process.exit(1);
});
