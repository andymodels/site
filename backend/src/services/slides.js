const { google } = require('googleapis');
const { makeFilePublic, revokeFilePublic, getImageDimensions } = require('./drive');

// Extracts text from a page element's textElements array.
function elementText(el) {
  if (!el.shape?.text) return '';
  return el.shape.text.textElements
    .map((te) => (te.textRun ? te.textRun.content : ''))
    .join('')
    .trim();
}

// Reads a slide's page elements and returns the bounding box for a given
// text label (e.g. "BOX01"). Returns null if not found.
function findBoxByLabel(pageElements, label) {
  for (const el of pageElements || []) {
    if (elementText(el).toUpperCase() === label.toUpperCase()) {
      const t = el.transform;
      const size = el.size;
      if (!t || !size) continue;
      const scaleX = t.scaleX != null ? t.scaleX : 1;
      const scaleY = t.scaleY != null ? t.scaleY : 1;
      return {
        objectId: el.objectId,
        left:   t.translateX / 12700,
        top:    t.translateY / 12700,
        width:  (size.width.magnitude  * scaleX) / 12700,
        height: (size.height.magnitude * scaleY) / 12700,
      };
    }
  }
  return null;
}

// Reads the template's first slide and returns the exact placeholder strings
// for the model name and measurements fields.
async function getTemplatePlaceholders(slidesApi, templateId) {
  const res = await slidesApi.presentations.get({ presentationId: templateId });
  const firstSlide = res.data.slides[0];

  let namePlaceholder = null;
  let measurementsPlaceholder = null;

  for (const el of firstSlide.pageElements || []) {
    const text  = elementText(el);
    const lower = text.toLowerCase();
    if (lower.includes('modelo') && !namePlaceholder) {
      namePlaceholder = text;
    } else if (
      (lower.includes('altura') || lower.includes('height')) &&
      !measurementsPlaceholder
    ) {
      measurementsPlaceholder = text;
    }
  }

  return { namePlaceholder, measurementsPlaceholder };
}

async function generateComposite(auth, templateId, modelName, medidas, imageIds, log = console.log) {
  const drive  = google.drive({ version: 'v3', auth });
  const slides = google.slides({ version: 'v1', auth });

  log(`  [slides] templateId="${templateId}" | modelName="${modelName}" | images=${imageIds.length}`);

  // ── 1. Read template placeholders ────────────────────────────────────────
  log(`  [slides] Reading template...`);
  const { namePlaceholder, measurementsPlaceholder } = await getTemplatePlaceholders(slides, templateId);
  log(`  [slides] Name placeholder    : "${namePlaceholder}"`);
  log(`  [slides] Measures placeholder: "${measurementsPlaceholder}"`);

  // ── 2. Copy template ──────────────────────────────────────────────────────
  const safeName = `Composite ${modelName}`.replace(/[/\\:*?"<>|]/g, '_').trim();
  log(`  [slides] Copying template → "${safeName}"`);

  let newPresentationId, presentationUrl;
  try {
    const copyRes = await drive.files.copy({
      fileId: templateId,
      supportsAllDrives: true,
      fields: 'id,webViewLink',
      requestBody: { name: safeName },
    });
    newPresentationId = copyRes.data.id;
    presentationUrl   = copyRes.data.webViewLink;
    log(`  [slides] Presentation created: ${newPresentationId}`);
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    throw new Error(`files.copy failed: ${JSON.stringify(detail)}`);
  }

  // ── 3. Get base slide ─────────────────────────────────────────────────────
  const presRes     = await slides.presentations.get({ presentationId: newPresentationId });
  const baseSlide   = presRes.data.slides[0];
  const baseSlideId = baseSlide.objectId;
  log(`  [slides] Base slide ID: ${baseSlideId}`);

  // ── 4. Duplicate base slide N times ──────────────────────────────────────
  const totalPairs = Math.ceil(imageIds.length / 2);
  log(`  [slides] Duplicating slide ${totalPairs}x...`);

  try {
    await slides.presentations.batchUpdate({
      presentationId: newPresentationId,
      requestBody: {
        requests: Array.from({ length: totalPairs }, () => ({
          duplicateObject: { objectId: baseSlideId },
        })),
      },
    });
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    throw new Error(`duplicateObject failed: ${JSON.stringify(detail)}`);
  }

  // ── 5. Replace text using replaceAllText (preserves original styles/colors) ─
  const replaceRequests = [];

  if (namePlaceholder) {
    replaceRequests.push({
      replaceAllText: {
        containsText: { text: namePlaceholder, matchCase: true },
        replaceText: modelName.toUpperCase(),
      },
    });
  } else {
    log(`  [slides] WARNING: name placeholder not found`);
  }

  if (measurementsPlaceholder) {
    replaceRequests.push({
      replaceAllText: {
        containsText: { text: measurementsPlaceholder, matchCase: true },
        replaceText: medidas,
      },
    });
  } else {
    log(`  [slides] WARNING: measurements placeholder not found`);
  }

  if (replaceRequests.length > 0) {
    try {
      await slides.presentations.batchUpdate({
        presentationId: newPresentationId,
        requestBody: { requests: replaceRequests },
      });
      log(`  [slides] Text replaced (styles preserved)`);
    } catch (err) {
      const detail = err.response?.data?.error || err.message;
      throw new Error(`replaceAllText failed: ${JSON.stringify(detail)}`);
    }
  }

  // ── 6. Get updated slide list ─────────────────────────────────────────────
  const presAfterText = await slides.presentations.get({ presentationId: newPresentationId });
  const newSlides     = presAfterText.data.slides.slice(1); // skip base slide

  // ── 7. Per slide: delete BOX placeholders and insert images ───────────────
  for (let si = 0; si < newSlides.length; si++) {
    const slide   = newSlides[si];
    const slideId = slide.objectId;
    const imgLeft  = imageIds[si * 2]     || null;
    const imgRight = imageIds[si * 2 + 1] || null;
    log(`  [slides] Slide ${si + 1}/${newSlides.length} (${slideId}) — [${imgLeft || '-'}, ${imgRight || '-'}]`);

    // Find BOX01 and BOX02 shapes in this slide
    const box1 = findBoxByLabel(slide.pageElements, 'BOX01');
    const box2 = findBoxByLabel(slide.pageElements, 'BOX02');
    log(`  [slides]   BOX01: ${box1 ? `${Math.round(box1.width)}x${Math.round(box1.height)}pt @ (${Math.round(box1.left)},${Math.round(box1.top)})` : 'not found'}`);
    log(`  [slides]   BOX02: ${box2 ? `${Math.round(box2.width)}x${Math.round(box2.height)}pt @ (${Math.round(box2.left)},${Math.round(box2.top)})` : 'not found'}`);

    const boxes     = [box1, box2];
    const imgIds    = [imgLeft, imgRight];
    const deleteReqs = [];
    const imgRequests         = [];
    const permissionsToRevoke = [];

    for (let bi = 0; bi < 2; bi++) {
      const fileId = imgIds[bi];
      const box    = boxes[bi];
      if (!box) continue;

      // Always delete the placeholder shape (even if no image for this slot)
      deleteReqs.push({ deleteObject: { objectId: box.objectId } });

      if (!fileId) continue;

      // Get natural image dimensions for proportional scaling
      let imgW = null, imgH = null;
      try {
        const dims = await getImageDimensions(auth, fileId);
        imgW = dims.width;
        imgH = dims.height;
      } catch (e) {
        log(`  [slides]   ↳ Could not read dimensions for ${fileId}: ${e.message}`);
      }

      // Make file temporarily public
      log(`  [slides]   ↳ Making image public: ${fileId}`);
      const { permissionId, url } = await makeFilePublic(auth, fileId);
      permissionsToRevoke.push({ fileId, permissionId });

      // Scale to fit box height, center horizontally inside the box
      let newW, newH, left, top;
      if (imgW && imgH) {
        const scale = box.height / imgH;
        newW = imgW * scale;
        newH = box.height;
        left = box.left + (box.width - newW) / 2;
        top  = box.top;
        log(`  [slides]   ↳ scale=${scale.toFixed(3)} → ${Math.round(newW)}×${Math.round(newH)}pt left=${Math.round(left)}pt`);
      } else {
        // Fallback: fill the entire box
        newW = box.width;
        newH = box.height;
        left = box.left;
        top  = box.top;
        log(`  [slides]   ↳ Dimensions unknown — filling box`);
      }

      const EMU = 12700;
      imgRequests.push({
        createImage: {
          url,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width:  { magnitude: newW * EMU, unit: 'EMU' },
              height: { magnitude: newH * EMU, unit: 'EMU' },
            },
            transform: {
              scaleX:     1,
              scaleY:     1,
              translateX: left * EMU,
              translateY: top  * EMU,
              unit: 'EMU',
            },
          },
        },
      });
    }

    // Delete placeholder shapes first
    if (deleteReqs.length > 0) {
      await slides.presentations.batchUpdate({
        presentationId: newPresentationId,
        requestBody: { requests: deleteReqs },
      });
    }

    // Insert images
    if (imgRequests.length > 0) {
      try {
        await slides.presentations.batchUpdate({
          presentationId: newPresentationId,
          requestBody: { requests: imgRequests },
        });
        log(`  [slides]   ↳ ${imgRequests.length} image(s) inserted`);
      } catch (err) {
        const detail = err.response?.data?.error || err.message;
        for (const { fileId, permissionId } of permissionsToRevoke) {
          await revokeFilePublic(auth, fileId, permissionId).catch(() => {});
        }
        throw new Error(`createImage failed on slide ${si + 1}: ${JSON.stringify(detail)}`);
      }
    }

    for (const { fileId, permissionId } of permissionsToRevoke) {
      await revokeFilePublic(auth, fileId, permissionId);
    }
    log(`  [slides]   ↳ Permissions revoked`);
  }

  // ── 8. Remove original base slide ─────────────────────────────────────────
  log(`  [slides] Removing base slide...`);
  try {
    await slides.presentations.batchUpdate({
      presentationId: newPresentationId,
      requestBody: { requests: [{ deleteObject: { objectId: baseSlideId } }] },
    });
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    throw new Error(`deleteObject (base slide) failed: ${JSON.stringify(detail)}`);
  }

  log(`  [slides] Done → ${presentationUrl}`);
  return presentationUrl;
}

module.exports = { generateComposite };
