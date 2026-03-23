const config = require('../config');

const DRIVERS = {
  local: require('./storage/local'),
  // s3: require('./storage/s3'),       // future: AWS S3 / Cloudflare R2
  // cloudinary: require('./storage/cloudinary'), // future: Cloudinary
};

function driver() {
  const d = DRIVERS[config.storageDriver];
  if (!d) throw new Error(`Unknown STORAGE_DRIVER: "${config.storageDriver}". Valid options: ${Object.keys(DRIVERS).join(', ')}`);
  return d;
}

module.exports = {
  saveFile: (file) => driver().saveFile(file),
  deleteFile: (url) => driver().deleteFile(url),
};
