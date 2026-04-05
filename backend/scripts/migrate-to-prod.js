#!/usr/bin/env node
/**
 * migrate-to-prod.js
 * Copia todos os modelos do banco local → produção via API
 * Uso: node scripts/migrate-to-prod.js
 */

const https = require('https');
const http  = require('http');
const path  = require('path');

const PROD  = process.env.API_URL   || 'https://site-uyyq.onrender.com';
const TOKEN = process.env.ADMIN_TOKEN || 'andy-secret-2025';

const Database = require('better-sqlite3');
const DB_PATH  = path.join(__dirname, '../../data/andy_models.db');
const db       = new Database(DB_PATH);

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod    = parsed.protocol === 'https:' ? https : http;
    const data   = body ? JSON.stringify(body) : null;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = mod.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const models = db.prepare('SELECT * FROM models WHERE active = 1 ORDER BY name').all();
  console.log(`\n=== Migrando ${models.length} modelos para ${PROD} ===\n`);

  let ok = 0, fail = 0;

  for (const m of models) {
    let categories = [];
    try { categories = JSON.parse(m.categories || '[]'); } catch {}
    if (!categories.length) categories = [m.category || 'women'];

    const payload = {
      name:        m.name,
      slug:        m.slug,
      category:    m.category || (categories[0] || 'women'),
      categories,
      age:         m.age,
      height:      m.height,
      bust:        m.bust,
      waist:       m.waist,
      hips:        m.hips,
      torax:       m.torax,
      terno:       m.terno,
      camisa:      m.camisa,
      manequim:    m.manequim,
      shoes:       m.shoes,
      eyes:        m.eyes,
      hair:        m.hair,
      city:        m.city,
      bio:         m.bio,
      featured:    m.featured || 0,
      active:      1,
    };

    try {
      const r = await req('POST', `${PROD}/api/admin/models`, payload);
      if (r.status === 201 || r.status === 200) {
        console.log(`  ✓ ${m.name}`);
        ok++;
      } else {
        console.log(`  ✗ ${m.name} — status ${r.status}: ${JSON.stringify(r.body).substring(0,80)}`);
        fail++;
      }
    } catch (e) {
      console.log(`  ✗ ${m.name} — erro: ${e.message}`);
      fail++;
    }

    await sleep(300);
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`✓ Migrados: ${ok}`);
  console.log(`✗ Falhas:   ${fail}`);
  console.log(`\nPróximo passo: rodar importAllFromSite.js para importar as fotos`);
  console.log(`API_URL=${PROD} ADMIN_TOKEN=${TOKEN} node scripts/importAllFromSite.js`);
}

main().catch(console.error);
