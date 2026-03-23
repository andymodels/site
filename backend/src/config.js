require('dotenv').config();
const path = require('path');

const REQUIRED = ['ADMIN_PASSWORD', 'ADMIN_SECRET'];

function validate() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('\n[config] ERROR: Missing required environment variables:');
    missing.forEach(k => console.error(`  - ${k}`));
    console.error('\nCopy .env.example to backend/.env and fill in the values.\n');
    process.exit(1);
  }
}

module.exports = {
  validate,
  port: parseInt(process.env.PORT) || 3001,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminSecret: process.env.ADMIN_SECRET,
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  uploadsDir: process.env.UPLOADS_DIR
    || (process.env.RENDER ? '/data/uploads' : path.join(__dirname, '../../uploads')),
  uploadsUrl: process.env.UPLOADS_URL || '/uploads',
  dbPath: process.env.DB_PATH
    || (process.env.RENDER ? '/data/andy_models.db' : path.join(__dirname, '../../data/andy_models.db')),
  drive: {
    folderFeminino: process.env.DRIVE_FOLDER_FEMININO || '15Tc0AC60g_67Gd-EujSu2eWGm8I-78bn',
    folderMasculino: process.env.DRIVE_FOLDER_MASCULINO || '1LgDoGg9deOLOjhRtZaLBM6QgTyH3FlEt',
    sheetFeminino: process.env.PLANILHA_FEMININO_ID || '188f8GtyTpd9CqLPRaQjFHuqMPaNM6tOD8Mkbvt6va9M',
    sheetMasculino: process.env.PLANILHA_MASCULINO_ID || '1lVPjjCSQrlMaqa5L41uQOuCP8mOOVtGjdSB2jl4soag',
    syncIntervalMs: parseInt(process.env.DRIVE_SYNC_INTERVAL_MS) || 30 * 60 * 1000,
    maxImagesPerModel: parseInt(process.env.DRIVE_SYNC_MAX_IMAGES) || 10,
    syncImages: process.env.DRIVE_SYNC_IMAGES !== 'false' ? false : false, // disabled: import images via URL
  },
};
