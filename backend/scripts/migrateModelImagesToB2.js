#!/usr/bin/env node
/**
 * Um único modelo (bea-estevam / TARGET_SLUG): lê no disco apenas ficheiros full_* (ex: full_01.jpg),
 * grava via storage.saveFile, atualiza media[0].url com a nova URL. Não altera media[0].thumb.
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/db');
const config = require('../src/config');
const storage = require('../src/services/storage');

/** Apenas este slug é processado. */
const TARGET_SLUG = 'bea-estevam';

function readUploadsFile(relativeFromUploadsRoot) {
  const fp = path.join(config.uploadsDir, relativeFromUploadsRoot);
  if (!fs.existsSync(fp)) {
    throw new Error(`Ficheiro não encontrado em uploads: ${fp}`);
  }
  return { buffer: fs.readFileSync(fp), absPath: fp };
}

/** Aceita só imagens "full" (nome contém full_), exclui thumb_. */
function isFullImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const base = path.basename(url.split('?')[0]).toLowerCase();
  if (base.includes('thumb_')) return false;
  return base.includes('full_');
}

/**
 * Preferência: cover_image, images[], media[].url — apenas URLs /uploads/... com ficheiro full_* existente.
 * Não usa cover_thumb nem media[].thumb como origem.
 */
function pickLocalUploadsSource(row) {
  const candidates = [];

  if (row.cover_image?.trim()) {
    candidates.push({ label: 'cover_image', url: row.cover_image.trim() });
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
      });
    }
  } catch {
    /* ignore */
  }

  for (const { label, url } of candidates) {
    if (!url.startsWith('/uploads/')) continue;
    if (!isFullImageUrl(url)) continue;
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
      `[migrateModelImagesToB2] Nenhuma imagem full_* local (/uploads/... existente) para slug="${TARGET_SLUG}".`
    );
    process.exit(1);
  }

  console.log('[migrateModelImagesToB2] Modelo:', { id: row.id, slug: row.slug });
  console.log('[migrateModelImagesToB2] Origem (full_*):', picked.label, '→', picked.url);

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

  const upd = db.prepare('UPDATE models SET media = ? WHERE slug = ?').run(JSON.stringify(media), TARGET_SLUG);

  console.log('[migrateModelImagesToB2] UPLOADS_DIR:', config.uploadsDir);
  console.log('[migrateModelImagesToB2] Nova URL (storage.saveFile):', newUrl);
  console.log('[migrateModelImagesToB2] media[0].url atualizado; thumb mantido se existia.');
  console.log('[migrateModelImagesToB2] Linhas alteradas:', upd.changes);
}

main().catch((e) => {
  console.error('[migrateModelImagesToB2] Erro:', e.message);
  process.exit(1);
});
