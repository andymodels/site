const express = require('express');
const router = express.Router();
const { getAuthorizedAuth } = require('../auth');
const {
  searchModelFolders,
  getSiteFolder,
  getImagesRecursive,
  streamImage,
} = require('../services/drive');
const { getModelMeasurements } = require('../services/sheets');
const { normalizar } = require('../utils/normalize');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// GET /api/models/search?gender=FEMININO&name=ana
// Returns matched model folders + debug info for diagnosis
router.get('/search', async (req, res) => {
  try {
    const { gender, name } = req.query;
    if (!gender || !name) {
      return res.status(400).json({ error: 'gender e name são obrigatórios' });
    }

    const auth = await getAuthorizedAuth();
    const normalizedInput = normalizar(name);
    log(`[search] gender=${gender.toUpperCase()} | input="${name}" | normalized="${normalizedInput}"`);

    const { models, debug } = await searchModelFolders(auth, gender.toUpperCase(), normalizedInput);

    log(`[search] Scanned ${debug.totalScanned} folders inside "${debug.genderFolderName}"`);
    if (debug.totalScanned > 0) {
      log(`[search] All folders: ${debug.allFolderNames.map((f) => f.raw).join(', ')}`);
    } else {
      log(`[search] WARNING: 0 folders found — check Drive sharing permissions for folder "${debug.genderFolderName}" (${debug.genderFolderId})`);
    }
    log(`[search] Matched: ${debug.matchedCount}`);
    models.forEach((m) => log(`[search]   ✓ "${m.name}" (${m.id})`));

    res.json({ models, debug });
  } catch (e) {
    log(`[search] ERRO: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/models/:folderId/images
// Finds the SITE subfolder then returns all images recursively (image/* only)
router.get('/:folderId/images', async (req, res) => {
  try {
    const { folderId } = req.params;
    const auth = await getAuthorizedAuth();
    log(`[images] folderId=${folderId}`);

    const siteFolder = await getSiteFolder(auth, folderId);
    if (!siteFolder) {
      log(`[images] SITE folder not found inside ${folderId}`);
      return res.status(404).json({ error: 'Pasta SITE não encontrada.' });
    }
    log(`[images] SITE folder found: "${siteFolder.name}" (${siteFolder.id})`);

    const fotos = await getImagesRecursive(auth, siteFolder.id);
    log(`[images] ${fotos.length} image(s) found`);

    res.json({ images: fotos });
  } catch (e) {
    log(`[images] ERRO: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/models/:folderId/measurements?gender=&modelName=
// Fetches model measurements from the correct spreadsheet
router.get('/:folderId/measurements', async (req, res) => {
  try {
    const { gender, modelName } = req.query;
    if (!gender || !modelName) {
      return res.status(400).json({ error: 'gender e modelName são obrigatórios' });
    }

    const auth = await getAuthorizedAuth();
    log(`[measurements] model="${modelName}" | gender=${gender.toUpperCase()}`);

    const measurements = await getModelMeasurements(auth, gender.toUpperCase(), modelName);
    if (!measurements) {
      log(`[measurements] Not found for "${modelName}"`);
      return res.status(404).json({ error: 'Medidas não encontradas.' });
    }

    log(`[measurements] Found: ${measurements.formatted}`);
    res.json(measurements);
  } catch (e) {
    log(`[measurements] ERRO: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/models/image/:fileId/proxy
// Streams image bytes from Drive (used for thumbnail display in frontend)
router.get('/image/:fileId/proxy', async (req, res) => {
  try {
    const { fileId } = req.params;
    const auth = await getAuthorizedAuth();
    await streamImage(auth, fileId, res);
  } catch (e) {
    log(`[proxy] ERRO: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
