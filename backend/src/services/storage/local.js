const fs = require('fs');
const path = require('path');
const config = require('../../config');

if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

module.exports = {
  saveFile(file) {
    const ext = path.extname(file.originalname) || '.bin';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const dest = path.join(config.uploadsDir, filename);
    fs.writeFileSync(dest, file.buffer);
    return `${config.uploadsUrl}/${filename}`;
  },

  deleteFile(url) {
    if (!url) return;
    const filename = path.basename(url);
    const filepath = path.join(config.uploadsDir, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  },
};
