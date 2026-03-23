const { google } = require('googleapis');
const { getAuthorizedAuth } = require('../auth');
const db = require('../db');
const config = require('../config');
const { getAllModels } = require('./sheets');
const { nomeCompativel } = require('../utils/normalize');
const { processImageBuffer, clearModelImages } = require('./imageProcessor');

// ─── In-memory state ────────────────────────────────────────────────────────
const state = {
  running: false,
  lastRun: null,
  lastResult: null,
};
const logBuffer = []; // newest first, capped at 300

function addLog(line) {
  const entry = `[${new Date().toISOString()}] ${line}`;
  console.log(entry);
  logBuffer.unshift(entry);
  if (logBuffer.length > 300) logBuffer.pop();
}

// ─── Drive helpers ───────────────────────────────────────────────────────────
function driveClient(auth) {
  return google.drive({ version: 'v3', auth });
}

const DRIVE_OPTS = { supportsAllDrives: true, includeItemsFromAllDrives: true };

async function listSubfolders(drive, parentId) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name,modifiedTime)',
    pageSize: 1000,
    ...DRIVE_OPTS,
  });
  return res.data.files || [];
}

async function findSiteFolder(drive, modelFolderId) {
  const subs = await listSubfolders(drive, modelFolderId);
  const exact = subs.filter(f => f.name.trim().toLowerCase() === 'site');
  if (exact.length === 0) return { folder: null, warning: null };
  if (exact.length > 1)   return { folder: exact[0], warning: 'múltiplas pastas "site" — usando a primeira' };
  return { folder: exact[0], warning: null };
}

async function listImages(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png') and trashed=false`,
    fields: 'files(id,name,mimeType)',
    pageSize: 1000,
    orderBy: 'name',
    ...DRIVE_OPTS,
  });
  return res.data.files || [];
}

async function downloadToBuffer(drive, fileId) {
  const response = await drive.files.get(
    { fileId, alt: 'media', ...DRIVE_OPTS },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(response.data);
}

// ─── Slug helper ─────────────────────────────────────────────────────────────
function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

// ─── Per-gender sync ─────────────────────────────────────────────────────────
async function syncGender(drive, genderFolderId, dbCategory, sheetModels) {
  const res = { created: 0, updated: 0, skipped: 0, errors: [], warnings: [] };

  addLog(`[${dbCategory.toUpperCase()}] ${sheetModels.length} modelos na planilha`);

  // ── Sheet-only mode (Drive image sync disabled) ───────────────────────────
  if (!config.drive.syncImages) {
    addLog(`[${dbCategory.toUpperCase()}] Modo planilha — sincronizando apenas dados (imagens via URL)`);

    for (const sheetModel of sheetModels) {
      const modelName = sheetModel.name?.trim();
      if (!modelName) continue;

      const m    = sheetModel.measurements?.raw || {};
      const slug = slugify(modelName);

      const existing = db.prepare(
        'SELECT id FROM models WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))'
      ).get(modelName);

      if (existing) {
        const isMasc = dbCategory === 'men';
        if (isMasc) {
          db.prepare(`UPDATE models SET height=?, torax=?, terno=?, camisa=?, manequim=?, shoes=?, hair=?, eyes=? WHERE id=?`)
            .run(m.altura||null, m.torax||null, m.terno||null, m.camisa||null, m.manequim||null, m.sapatos||null, m.cabelos||null, m.olhos||null, existing.id);
        } else {
          db.prepare(`UPDATE models SET height=?, bust=?, waist=?, hips=?, manequim=?, shoes=?, hair=?, eyes=? WHERE id=?`)
            .run(m.altura||null, m.busto||null, m.cintura||null, m.quadril||null, m.manequim||null, m.sapatos||null, m.cabelos||null, m.olhos||null, existing.id);
        }
        addLog(`UPDATE metadata "${modelName}"`);
        res.updated++;
      } else {
        let dbSlug = slug;
        if (db.prepare('SELECT id FROM models WHERE slug=?').get(dbSlug)) {
          dbSlug = `${slug}-${Date.now()}`;
        }
        const isMasc = dbCategory === 'men';
        if (isMasc) {
          db.prepare(`INSERT INTO models (name,slug,category,categories,height,torax,terno,camisa,manequim,shoes,hair,eyes,active,media,images)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,'[]','[]]')`)
            .run(modelName,dbSlug,dbCategory,JSON.stringify([dbCategory]),m.altura||null,m.torax||null,m.terno||null,m.camisa||null,m.manequim||null,m.sapatos||null,m.cabelos||null,m.olhos||null);
        } else {
          db.prepare(`INSERT INTO models (name,slug,category,categories,height,bust,waist,hips,manequim,shoes,hair,eyes,active,media,images)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,'[]','[]')`)
            .run(modelName,dbSlug,dbCategory,JSON.stringify([dbCategory]),m.altura||null,m.busto||null,m.cintura||null,m.quadril||null,m.manequim||null,m.sapatos||null,m.cabelos||null,m.olhos||null);
        }
        addLog(`CREATE "${modelName}" — sem imagens (adicionar via URL no admin)`);
        res.created++;
      }
    }

    return res;
  }

  // ── Full Drive sync mode ──────────────────────────────────────────────────
  const modelFolders = await listSubfolders(drive, genderFolderId);
  addLog(`[${dbCategory.toUpperCase()}] ${modelFolders.length} pastas no Drive`);

  for (const sheetModel of sheetModels) {
    const modelName = sheetModel.name?.trim();
    if (!modelName) continue;

    const matched = modelFolders.filter(f => nomeCompativel(f.name, modelName));
    if (matched.length === 0) {
      addLog(`SKIP "${modelName}" — pasta não encontrada no Drive`);
      res.skipped++;
      continue;
    }

    const modelFolder = matched[0];

    const { folder: siteFolder, warning } = await findSiteFolder(drive, modelFolder.id);
    if (warning) {
      res.warnings.push({ model: modelName, warning });
      addLog(`WARN "${modelName}" — ${warning}`);
    }
    if (!siteFolder) {
      addLog(`SKIP "${modelName}" — pasta "site" não encontrada`);
      res.errors.push({ model: modelName, error: 'pasta "site" não encontrada' });
      res.skipped++;
      continue;
    }

    let images = await listImages(drive, siteFolder.id);
    if (images.length === 0) {
      addLog(`SKIP "${modelName}" — nenhuma imagem em "site"`);
      res.skipped++;
      continue;
    }

    const max = config.drive.maxImagesPerModel;
    if (images.length > max) {
      addLog(`INFO "${modelName}" — limitando a ${max}/${images.length} imagens`);
      images = images.slice(0, max);
    }

    const slug = slugify(modelName);
    const isUpdate = !!db.prepare('SELECT id FROM models WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(modelName);

    if (isUpdate) clearModelImages(slug);

    const thumbUrls = [];
    const fullUrls  = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const buffer = await downloadToBuffer(drive, img.id);
        const { thumb, full } = await processImageBuffer(buffer, slug, i + 1);
        thumbUrls.push(thumb);
        fullUrls.push(full);
      } catch (e) {
        addLog(`ERROR "${modelName}" — falha ao processar "${img.name}": ${e.message}`);
      }
    }

    if (fullUrls.length === 0) {
      res.errors.push({ model: modelName, error: 'falha no processamento de todas as imagens' });
      continue;
    }

    const m = sheetModel.measurements?.raw || {};
    const coverImage = fullUrls[0];
    const coverThumb = thumbUrls[0];
    const galleryImages = JSON.stringify(fullUrls.slice(1));
    const now = new Date().toISOString();
    const mediaItems = fullUrls.map((url, idx) => ({
      type: 'image', url, thumb: thumbUrls[idx] || null, polaroid: false,
    }));

    const existing = db.prepare('SELECT id FROM models WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(modelName);

    if (existing) {
      db.prepare(`
        UPDATE models
        SET cover_image=?, cover_thumb=?, images=?, media=?, height=?, bust=?, waist=?, hips=?,
            shoes=?, hair=?, eyes=?, drive_folder_id=?, drive_synced_at=?
        WHERE id=?
      `).run(
        coverImage, coverThumb, galleryImages, JSON.stringify(mediaItems),
        m.altura||null, m.busto||null, m.cintura||null, m.quadril||null,
        m.sapatos||null, m.cabelos||null, m.olhos||null,
        modelFolder.id, now, existing.id
      );
      addLog(`UPDATE "${modelName}" — ${fullUrls.length} imagem(s)`);
      res.updated++;
    } else {
      let dbSlug = slug;
      if (db.prepare('SELECT id FROM models WHERE slug=?').get(dbSlug)) {
        dbSlug = `${slug}-${Date.now()}`;
      }
      db.prepare(`
        INSERT INTO models
          (name, slug, category, categories, height, bust, waist, hips, shoes, hair, eyes,
           cover_image, cover_thumb, images, media, active, drive_folder_id, drive_synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        modelName, dbSlug, dbCategory, JSON.stringify([dbCategory]),
        m.altura||null, m.busto||null, m.cintura||null, m.quadril||null,
        m.sapatos||null, m.cabelos||null, m.olhos||null,
        coverImage, coverThumb, galleryImages, JSON.stringify(mediaItems),
        modelFolder.id, now
      );
      addLog(`CREATE "${modelName}" — ${fullUrls.length} imagem(s)`);
      res.created++;
    }
  }

  return res;
}

// ─── Main sync entry point ────────────────────────────────────────────────────
async function runSync() {
  if (state.running) {
    addLog('Sync já em execução — chamada ignorada.');
    return null;
  }

  state.running = true;
  addLog('═══ INÍCIO DA SINCRONIZAÇÃO ═══');

  const result = {
    started_at: new Date().toISOString(),
    finished_at: null,
    total_created: 0,
    total_updated: 0,
    total_skipped: 0,
    errors: [],
    warnings: [],
    ok: false,
  };

  try {
    const auth = await getAuthorizedAuth();
    const drive = driveClient(auth);

    const genders = [
      { folderId: config.drive.folderFeminino,  sheetGender: 'FEMININO',  dbCategory: 'women' },
      { folderId: config.drive.folderMasculino, sheetGender: 'MASCULINO', dbCategory: 'men'   },
    ];

    for (const g of genders) {
      addLog(`─── ${g.sheetGender} ───`);
      const sheetModels = await getAllModels(auth, g.sheetGender);
      const res = await syncGender(drive, g.folderId, g.dbCategory, sheetModels);
      result.total_created  += res.created;
      result.total_updated  += res.updated;
      result.total_skipped  += res.skipped;
      result.errors.push(...res.errors);
      result.warnings.push(...res.warnings);
    }

    result.ok = true;
    addLog(
      `═══ CONCLUÍDO — criados: ${result.total_created}, atualizados: ${result.total_updated}, ` +
      `pulados: ${result.total_skipped}, erros: ${result.errors.length} ═══`
    );
  } catch (e) {
    result.errors.push({ model: 'global', error: e.message });
    addLog(`ERRO GLOBAL: ${e.message}`);
  } finally {
    result.finished_at = new Date().toISOString();
    state.running   = false;
    state.lastRun   = result.finished_at;
    state.lastResult = result;
  }

  return result;
}

function getState() {
  return {
    running:     state.running,
    lastRun:     state.lastRun,
    lastResult:  state.lastResult,
    recentLogs:  logBuffer.slice(0, 100),
  };
}

module.exports = { runSync, getState };
