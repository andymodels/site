#!/usr/bin/env node
/**
 * Conta quantos registros em `models` têm pelo menos uma URL de imagem
 * (cover_image, cover_thumb, images ou media) que não começa com
 * https://f005.backblazeb2.com
 *
 * Usa o mesmo módulo backend/src/db.js do servidor.
 * Apenas contagem — não faz upload nem altera dados aqui.
 */

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/db');

const B2_PREFIX = 'https://f005.backblazeb2.com';

function isNonB2ImageUrl(s) {
  if (s == null || typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  return !t.startsWith(B2_PREFIX);
}

function rowHasNonB2Image(row) {
  if (isNonB2ImageUrl(row.cover_image)) return true;
  if (isNonB2ImageUrl(row.cover_thumb)) return true;

  try {
    const imgs = JSON.parse(row.images || '[]');
    if (Array.isArray(imgs)) {
      for (const u of imgs) {
        if (isNonB2ImageUrl(u)) return true;
      }
    }
  } catch {
    /* ignore malformed JSON */
  }

  try {
    const media = JSON.parse(row.media || '[]');
    if (Array.isArray(media)) {
      for (const item of media) {
        if (item.type === 'video') continue;
        if (item.type && item.type !== 'image') continue;
        if (isNonB2ImageUrl(item.url)) return true;
        if (isNonB2ImageUrl(item.thumb)) return true;
      }
    }
  } catch {
    /* ignore */
  }

  return false;
}

function main() {
  const rows = db.prepare('SELECT id, slug, cover_image, cover_thumb, images, media FROM models').all();

  let withNonB2 = 0;
  for (const row of rows) {
    if (rowHasNonB2Image(row)) withNonB2 += 1;
  }

  console.log('[migrateModelImagesToB2] Prefixo B2 esperado:', B2_PREFIX);
  console.log('[migrateModelImagesToB2] Total de registros (models):', rows.length);
  console.log(
    '[migrateModelImagesToB2] Registros com pelo menos uma imagem (URL não vazia) que NÃO começa pelo prefixo B2:',
    withNonB2
  );
}

main();
