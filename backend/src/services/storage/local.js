const fs = require('fs');
const path = require('path');
const config = require('../../config');

if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

module.exports = {
  saveFile(file) {
    const ext = path.extname(file.originalname) || '.bin';
    const relative = file.key || `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const dest = path.join(config.uploadsDir, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.buffer);
    const urlPath = relative.split(path.sep).join('/');
    return `${config.uploadsUrl}/${urlPath}`;
  },

  deleteFile(url) {
    if (!url) return;
    const uploadsPrefix = (config.uploadsUrl || '/uploads').replace(/\/$/, '');
    let rel = null;
    if (/^https?:\/\//i.test(url)) {
      try {
        const pathname = decodeURIComponent(new URL(url).pathname);
        if (pathname.startsWith('/uploads/')) rel = pathname.slice('/uploads/'.length);
      } catch {
        return;
      }
    } else if (url.startsWith('/uploads/')) {
      rel = url.slice('/uploads/'.length);
    } else if (url.startsWith(uploadsPrefix + '/')) {
      rel = url.slice(uploadsPrefix.length + 1);
    } else {
      rel = path.basename(url);
    }
    if (!rel) return;
    const filepath = path.join(config.uploadsDir, rel);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  },
};
