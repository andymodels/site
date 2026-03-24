#!/usr/bin/env node
const https = require('https');
const path  = require('path');

const PROD  = 'https://site-uyyq.onrender.com';
const TOKEN = 'andy-secret-2025';

const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../../data/andy_models.db'));

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const data   = body ? JSON.stringify(body) : null;
    const parsed = new URL(url);
    const opts   = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, body: buf }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Buscar todos os modelos em produção
  const prodRes = await req('GET', `${PROD}/api/models?limit=200`, null);
  const prodModels = Array.isArray(prodRes.body) ? prodRes.body : (prodRes.body.models || []);
  console.log(`Modelos em produção: ${prodModels.length}`);

  // Mapa local de slug → category/categories
  const localModels = db.prepare('SELECT slug, category, categories FROM models').all();
  const localMap = {};
  localModels.forEach(m => { localMap[m.slug] = m; });

  let fixed = 0, skip = 0;

  for (const prod of prodModels) {
    const local = localMap[prod.slug];
    if (!local) { console.log(`  ? ${prod.slug} — não encontrado localmente`); continue; }

    let localCats = [];
    try { localCats = JSON.parse(local.categories || '[]'); } catch {}
    if (!localCats.length) localCats = [local.category];

    const prodCats = (() => { try { return JSON.parse(prod.categories || '[]'); } catch { return [prod.category]; } })();

    const catOk  = JSON.stringify(localCats.sort()) === JSON.stringify(prodCats.sort());
    const mainOk = local.category === prod.category;

    if (catOk && mainOk) { skip++; continue; }

    console.log(`  FIX ${prod.name}: prod=[${prodCats}] → local=[${localCats}]`);
    const r = await req('PUT', `${PROD}/api/admin/models/${prod.id}`, {
      ...prod,
      category:   local.category,
      categories: JSON.stringify(localCats),
    });
    if (r.status === 200) { fixed++; } else { console.log(`    ERRO ${r.status}:`, JSON.stringify(r.body).substring(0, 80)); }
    await sleep(150);
  }

  console.log(`\nCorrigidos: ${fixed} | OK: ${skip}`);
}

main().catch(console.error);
