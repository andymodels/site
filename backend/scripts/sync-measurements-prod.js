#!/usr/bin/env node
/**
 * sync-measurements-prod.js
 * Sincroniza exclusivamente os campos de medidas + hair/eyes do banco local → produção.
 * Busca o ID real de cada modelo em produção pelo slug, depois faz PUT só com as medidas.
 */

const https   = require('https');
const path    = require('path');
const Database = require('better-sqlite3');

const PROD  = process.env.API_URL    || 'https://site-uyyq.onrender.com';
const TOKEN = process.env.ADMIN_TOKEN || 'andy-secret-2025';
const DB_PATH = path.join(__dirname, '../../data/andy_models.db');
const db = new Database(DB_PATH);

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data   = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = https.request(opts, res => {
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
  // 1. Buscar lista completa de modelos em produção (com IDs)
  console.log('Buscando modelos em produção...');
  const listRes = await request('GET', `${PROD}/api/admin/models?limit=500`, null);
  if (listRes.status !== 200) {
    console.error('Falha ao buscar modelos:', listRes.status, listRes.body);
    process.exit(1);
  }

  const prodModels = listRes.body.models || listRes.body;
  const prodById   = {};
  const prodBySlug = {};
  for (const m of prodModels) {
    prodById[m.id]     = m;
    prodBySlug[m.slug] = m;
  }
  console.log(`  ${prodModels.length} modelos encontrados em produção.\n`);

  // 2. Para cada modelo local, fazer PUT só com os campos de medidas
  const localModels = db.prepare('SELECT * FROM models WHERE active = 1').all();

  const MEASURE_FIELDS = ['height','bust','waist','hips','torax','terno','camisa','manequim','shoes','hair','eyes'];

  let ok = 0, fail = 0, notFound = 0;

  for (const local of localModels) {
    const prod = prodBySlug[local.slug];
    if (!prod) {
      console.log(`  ⚠ não encontrado em prod: ${local.name} (slug: ${local.slug})`);
      notFound++;
      continue;
    }

    // Montar payload apenas com os campos de medidas
    const payload = {};
    for (const f of MEASURE_FIELDS) {
      payload[f] = local[f] ?? null;
    }

    const res = await request('PUT', `${PROD}/api/admin/models/${prod.id}`, payload);
    if (res.status === 200) {
      console.log(`  ✓ ${local.name}`);
      ok++;
    } else {
      console.log(`  ✗ ${local.name} — ${res.status}: ${JSON.stringify(res.body).slice(0,80)}`);
      fail++;
    }

    await sleep(200);
  }

  console.log('\n=== RESULTADO ===');
  console.log(`✓ Atualizados: ${ok}`);
  console.log(`✗ Falhas:      ${fail}`);
  console.log(`⚠ Não encontrados em prod: ${notFound}`);
}

main().catch(console.error);
