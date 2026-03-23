const { google } = require('googleapis');
const { normalizar, nomeCompativel } = require('../utils/normalize');

function getDriveClient(auth) {
  return google.drive({ version: 'v3', auth });
}

async function searchModelFolders(auth, gender, searchName) {
  const drive = getDriveClient(auth);
  const pastaRaizId = process.env.PASTA_RAIZ_ID;

  // Step 1: find FEMININO / MASCULINO folder inside root
  const sexoRes = await drive.files.list({
    q: `'${pastaRaizId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${gender}' and trashed=false`,
    fields: 'files(id,name)',
  });

  if (!sexoRes.data.files || sexoRes.data.files.length === 0) {
    throw new Error(`Pasta ${gender} não encontrada dentro da pasta raiz.`);
  }

  const pastaSexo = sexoRes.data.files[0];

  // Step 2: list ALL model subfolders inside the gender folder
  const modelosRes = await drive.files.list({
    q: `'${pastaSexo.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1000,
  });

  const todos = modelosRes.data.files || [];

  // Step 3: tolerant match — normalize both sides, partial match both directions
  const normalizedSearch = normalizar(searchName);
  const encontrados = todos.filter((p) => nomeCompativel(p.name, normalizedSearch));

  const debug = {
    genderFolderId: pastaSexo.id,
    genderFolderName: pastaSexo.name,
    totalScanned: todos.length,
    normalizedSearch,
    allFolderNames: todos.map((p) => ({ raw: p.name, normalized: normalizar(p.name) })),
    matchedCount: encontrados.length,
  };

  return { models: encontrados, debug };
}

async function getSiteFolder(auth, modelFolderId) {
  const drive = getDriveClient(auth);

  const res = await drive.files.list({
    q: `'${modelFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
  });

  const pastas = res.data.files || [];
  const site = pastas.find((p) => normalizar(p.name).indexOf('SITE') !== -1);
  return site || null;
}

async function getImagesRecursive(auth, folderId) {
  const drive = getDriveClient(auth);
  const fotos = [];

  async function buscar(id) {
    const res = await drive.files.list({
      q: `'${id}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,thumbnailLink,imageMediaMetadata)',
      pageSize: 1000,
    });

    const items = res.data.files || [];

    for (const item of items) {
      if (item.mimeType && item.mimeType.startsWith('image/')) {
        fotos.push({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          thumbnailLink: item.thumbnailLink || null,
          width: item.imageMediaMetadata ? item.imageMediaMetadata.width : null,
          height: item.imageMediaMetadata ? item.imageMediaMetadata.height : null,
        });
      } else if (item.mimeType === 'application/vnd.google-apps.folder') {
        await buscar(item.id);
      }
    }
  }

  await buscar(folderId);
  return fotos;
}

async function streamImage(auth, fileId, res) {
  const drive = getDriveClient(auth);
  const meta = await drive.files.get({ fileId, fields: 'mimeType' });
  const mimeType = meta.data.mimeType;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const stream = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  stream.data.pipe(res);
}

async function getImageDimensions(auth, fileId) {
  const drive = getDriveClient(auth);
  const res = await drive.files.get({
    fileId,
    fields: 'imageMediaMetadata,mimeType',
  });
  return {
    mimeType: res.data.mimeType,
    width: res.data.imageMediaMetadata ? res.data.imageMediaMetadata.width : null,
    height: res.data.imageMediaMetadata ? res.data.imageMediaMetadata.height : null,
  };
}

// Makes the original file temporarily public (no copy created, no storage used).
// Returns the public URL and the permission ID needed to revoke after use.
async function makeFilePublic(auth, fileId) {
  const drive = getDriveClient(auth);

  const perm = await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    fields: 'id',
  });

  const meta = await drive.files.get({ fileId, fields: 'webContentLink' });
  const url = meta.data.webContentLink || `https://drive.google.com/uc?export=download&id=${fileId}`;
  return { permissionId: perm.data.id, url };
}

// Revokes the temporary public permission from the original file.
async function revokeFilePublic(auth, fileId, permissionId) {
  const drive = getDriveClient(auth);
  try {
    await drive.permissions.delete({ fileId, permissionId });
  } catch (e) {}
}

// Cleanup: deletes any leftover _tmp_composite_* files from failed runs.
async function cleanupTempFiles(auth) {
  const drive = getDriveClient(auth);
  const res = await drive.files.list({
    q: `name contains '_tmp_composite_' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1000,
  });
  const files = res.data.files || [];
  for (const f of files) {
    try {
      await drive.files.delete({ fileId: f.id });
      console.log(`[cleanup] Deleted leftover temp file: ${f.name}`);
    } catch (e) {}
  }
  return files.length;
}

module.exports = {
  searchModelFolders,
  getSiteFolder,
  getImagesRecursive,
  streamImage,
  getImageDimensions,
  makeFilePublic,
  revokeFilePublic,
  cleanupTempFiles,
};
