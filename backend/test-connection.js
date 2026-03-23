require('dotenv').config();
const { google } = require('googleapis');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function ok(msg) { console.log(`${COLORS.green}  ✓${COLORS.reset} ${msg}`); }
function fail(msg, detail) {
  console.log(`${COLORS.red}  ✗${COLORS.reset} ${msg}`);
  if (detail) console.log(`${COLORS.gray}    ${detail}${COLORS.reset}`);
}
function info(msg) { console.log(`${COLORS.cyan}  →${COLORS.reset} ${msg}`); }
function section(msg) { console.log(`\n${COLORS.yellow}${msg}${COLORS.reset}`); }

async function run() {
  console.log(`\n${COLORS.cyan}Composite Generator — Google API Connection Test${COLORS.reset}`);
  console.log('─'.repeat(50));

  // ── 1. ENV VARS ──────────────────────────────────────
  section('1. Environment variables');

  const required = [
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'TEMPLATE_ID',
    'PASTA_RAIZ_ID',
    'PLANILHA_MASCULINO_ID',
    'PLANILHA_FEMININO_ID',
  ];

  let envOk = true;
  for (const key of required) {
    if (process.env[key]) {
      ok(`${key} = ${process.env[key].substring(0, 40)}...`);
    } else {
      fail(`${key} is missing`);
      envOk = false;
    }
  }

  if (!envOk) {
    console.log(`\n${COLORS.red}Aborted: configure backend/.env before running this test.${COLORS.reset}`);
    console.log(`${COLORS.gray}Copy .env.example → backend/.env and fill in your credentials.${COLORS.reset}\n`);
    process.exit(1);
  }

  // ── 2. AUTH ───────────────────────────────────────────
  section('2. Service Account authentication');

  let auth;
  try {
    auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/presentations',
      ]
    );
    await auth.authorize();
    ok('JWT token obtained successfully');
  } catch (e) {
    fail('Authentication failed', e.message);
    process.exit(1);
  }

  // ── 3. DRIVE ──────────────────────────────────────────
  section('3. Google Drive API');
  const drive = google.drive({ version: 'v3', auth });

  try {
    const res = await drive.files.get({
      fileId: process.env.PASTA_RAIZ_ID,
      fields: 'id,name,mimeType',
    });
    ok(`Root folder found: "${res.data.name}" (${res.data.mimeType})`);

    // check FEMININO subfolder
    const femRes = await drive.files.list({
      q: `'${process.env.PASTA_RAIZ_ID}' in parents and name='FEMININO' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
    });
    if (femRes.data.files.length > 0) {
      ok(`Subfolder FEMININO found: id=${femRes.data.files[0].id}`);
    } else {
      fail('Subfolder FEMININO not found inside root folder');
    }

    // check MASCULINO subfolder
    const mascRes = await drive.files.list({
      q: `'${process.env.PASTA_RAIZ_ID}' in parents and name='MASCULINO' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
    });
    if (mascRes.data.files.length > 0) {
      ok(`Subfolder MASCULINO found: id=${mascRes.data.files[0].id}`);
    } else {
      fail('Subfolder MASCULINO not found inside root folder');
    }
  } catch (e) {
    fail('Drive API error', e.message);
    info('Make sure the service account has access to the root folder.');
  }

  // ── 4. SHEETS ─────────────────────────────────────────
  section('4. Google Sheets API');
  const sheets = google.sheets({ version: 'v4', auth });

  for (const [label, id] of [
    ['FEMININO spreadsheet', process.env.PLANILHA_FEMININO_ID],
    ['MASCULINO spreadsheet', process.env.PLANILHA_MASCULINO_ID],
  ]) {
    try {
      const res = await sheets.spreadsheets.get({
        spreadsheetId: id,
        fields: 'properties(title),sheets(properties(title,sheetId))',
      });
      const title = res.data.properties.title;
      const sheetNames = res.data.sheets.map((s) => s.properties.title).join(', ');
      ok(`${label}: "${title}" — sheets: [${sheetNames}]`);

      const dataRes = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: 'A1:I3',
      });
      const rows = dataRes.data.values || [];
      info(`First row (headers): ${JSON.stringify(rows[0] || [])}`);
    } catch (e) {
      fail(`${label} error`, e.message);
      info('Make sure the service account has at least viewer access to the spreadsheet.');
    }
  }

  // ── 5. SLIDES TEMPLATE ────────────────────────────────
  section('5. Google Slides template');
  const slidesApi = google.slides({ version: 'v1', auth });

  try {
    const res = await slidesApi.presentations.get({
      presentationId: process.env.TEMPLATE_ID,
      fields: 'presentationId,title,slides',
    });
    ok(`Template found: "${res.data.title}"`);
    info(`Slides in template: ${res.data.slides.length}`);

    const firstSlide = res.data.slides[0];
    const shapes = (firstSlide.pageElements || []).filter((el) => el.shape);
    info(`Shapes on first slide: ${shapes.length}`);

    const EMU = 12700;
    const boxes = shapes
      .filter((el) => {
        const t = el.transform;
        const s = el.size;
        if (!t || !s) return false;
        const w = (s.width.magnitude * (t.scaleX || 1)) / EMU;
        const h = (s.height.magnitude * (t.scaleY || 1)) / EMU;
        return w > 200 && h > 200;
      })
      .map((el) => {
        const t = el.transform;
        const s = el.size;
        const w = (s.width.magnitude * (t.scaleX || 1)) / EMU;
        const h = (s.height.magnitude * (t.scaleY || 1)) / EMU;
        return { w: Math.round(w), h: Math.round(h), left: Math.round(t.translateX / EMU) };
      })
      .sort((a, b) => a.left - b.left);

    if (boxes.length >= 2) {
      ok(`Image boxes detected: ${boxes.map((b) => `${b.w}×${b.h}pt`).join(', ')}`);
    } else {
      fail(`Expected ≥2 image boxes, found ${boxes.length}`);
      info('Template shapes may not match the expected dimensions (>200×200pt).');
    }
  } catch (e) {
    fail('Slides API error', e.message);
    info('Make sure the service account has access to the template presentation.');
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`${COLORS.cyan}Test complete.${COLORS.reset}\n`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
