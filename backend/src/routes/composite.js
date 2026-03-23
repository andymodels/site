const express = require('express');
const router = express.Router();
const { getAuthorizedAuth } = require('../auth');
const { generateComposite } = require('../services/slides');
const { getModelMeasurements } = require('../services/sheets');
const { cleanupTempFiles } = require('../services/drive');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// POST /api/composite/generate
router.post('/generate', async (req, res) => {
  try {
    const { modelName, gender, imageIds } = req.body;

    if (!modelName || !gender) {
      return res.status(400).json({ error: 'modelName e gender são obrigatórios' });
    }
    if (!imageIds || imageIds.length < 2) {
      return res.status(400).json({ error: 'Selecione pelo menos 2 imagens.' });
    }

    const auth = await getAuthorizedAuth();
    log(`[generate] ${modelName} | ${gender} | ${imageIds.length} imagens`);

    const measurements = await getModelMeasurements(auth, gender.toUpperCase(), modelName);
    if (!measurements) {
      return res.status(404).json({ error: `Medidas não encontradas para "${modelName}".` });
    }
    log(`[generate] Medidas: ${measurements.formatted}`);

    const url = await generateComposite(
      auth,
      process.env.TEMPLATE_ID,
      modelName,
      measurements.formatted,
      imageIds,
      log
    );

    log(`[generate] Concluído → ${url}`);
    res.json({ url });
  } catch (e) {
    log(`[generate] ERRO: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/composite/cleanup
// Deletes any leftover _tmp_composite_* files from failed runs.
router.post('/cleanup', async (req, res) => {
  try {
    const auth = await getAuthorizedAuth();
    log(`[cleanup] Scanning for leftover temp files...`);
    const count = await cleanupTempFiles(auth);
    log(`[cleanup] Deleted ${count} temp file(s)`);
    res.json({ deleted: count });
  } catch (e) {
    log(`[cleanup] ERRO: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

