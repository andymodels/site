const config = require('../config');

const DRIVERS = {
  local: require('./storage/local'),
  b2: require('./storage/b2'),
};

function driver() {
  const d = DRIVERS[config.storageDriver];
  if (!d) {
    throw new Error(
      `Unknown STORAGE_DRIVER: "${config.storageDriver}". Valid options: ${Object.keys(DRIVERS).join(', ')}`
    );
  }
  return d;
}

module.exports = {
  /**
   * Local: retorna string (síncrono). B2: retorna Promise<string>.
   */
  saveFile(file) {
    try {
      return driver().saveFile(file);
    } catch (e) {
      return Promise.reject(e);
    }
  },

  /**
   * Local: síncrono, sem retorno útil. B2: retorna Promise.
   */
  deleteFile(url) {
    if (url == null || url === '') return;
    try {
      return driver().deleteFile(url);
    } catch (e) {
      return Promise.reject(e);
    }
  },
};
