#!/usr/bin/env node
/**
 * cleanup-duplicate-models.js
 * Deleta da produção todos os modelos cujo slug termina em -<timestamp13digitos>.
 * Mantém apenas os registros originais (slug limpo, sem timestamp).
 */

const https = require('https');
const fs    = require('fs');

const PROD  = process.env.API_URL    || 'https://site-uyyq.onrender.com';
const TOKEN = process.env.ADMIN_TOKEN || 'andy-secret-2025';

const ids = JSON.parse(fs.readFileSync('/tmp/ids_to_delete.json', 'utf8'));

function del(id) {
  return new Promise((resolve) => {
    const opts = {
      hostname: new URL(PROD).hostname,
      port: 443,
      path: `/api/admin/models/${id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    };
    const r = https.request(opts, res => {
      res.resume();
      resolve(res.statusCode);
    });
    r.on('error', () => resolve(0));
    r.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`Deletando ${ids.length} registros duplicados...`);
  let ok = 0, fail = 0;

  for (const id of ids) {
    const status = await del(id);
    if (status === 200 || status === 204) {
      process.stdout.write('.');
      ok++;
    } else {
      process.stdout.write(`[${id}:${status}]`);
      fail++;
    }
    await sleep(150);
  }

  console.log(`\n\n✓ Deletados: ${ok} | ✗ Falhas: ${fail}`);
}

main().catch(console.error);
