const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

function requiredEnv() {
  const endpoint = process.env.B2_S3_ENDPOINT;
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APPLICATION_KEY;
  const bucket = process.env.B2_BUCKET;
  const publicBase = process.env.B2_PUBLIC_BASE_URL;
  const missing = [];
  if (!endpoint) missing.push('B2_S3_ENDPOINT');
  if (!keyId) missing.push('B2_KEY_ID');
  if (!appKey) missing.push('B2_APPLICATION_KEY');
  if (!bucket) missing.push('B2_BUCKET');
  if (!publicBase) missing.push('B2_PUBLIC_BASE_URL');
  if (missing.length) {
    throw new Error(`[storage/b2] Defina as variáveis: ${missing.join(', ')}`);
  }
  return {
    endpoint: endpoint.replace(/\/$/, ''),
    keyId,
    appKey,
    bucket,
    publicBase: publicBase.replace(/\/$/, ''),
  };
}

let _client;

function getClient() {
  if (_client) return _client;
  const { endpoint, keyId, appKey } = requiredEnv();
  _client = new S3Client({
    region: 'us-east-1',
    endpoint,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: appKey,
    },
    forcePathStyle: true,
  });
  return _client;
}

function guessContentType(ext) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function publicUrlForKey(publicBase, key) {
  return `${publicBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function urlToObjectKey(url, publicBase) {
  if (!url || typeof url !== 'string') return null;
  const base = publicBase.replace(/\/$/, '');
  const u = url.trim();
  if (u.startsWith(base + '/')) {
    return decodeURIComponent(u.slice(base.length + 1));
  }
  return path.basename(u);
}

module.exports = {
  async saveFile(file) {
    const { bucket, publicBase } = requiredEnv();
    const ext = path.extname(file.originalname) || '.bin';
    const key = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const client = getClient();
    const contentType = file.mimetype || guessContentType(ext);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
      })
    );

    return publicUrlForKey(publicBase, key);
  },

  async deleteFile(url) {
    if (!url) return;
    const { bucket, publicBase } = requiredEnv();
    const key = urlToObjectKey(url, publicBase);
    if (!key) return;

    const client = getClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  },
};
