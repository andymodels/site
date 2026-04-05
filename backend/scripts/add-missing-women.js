#!/usr/bin/env node
const https = require('https');
const http  = require('http');

const PROD  = process.env.API_URL   || 'https://site-uyyq.onrender.com';
const TOKEN = process.env.ADMIN_TOKEN || 'andy-secret-2025';

const MISSING = [
  { name: 'FERNANDA',       slug: 'fernanda',        site_slug: 'fernanda',        category: 'women', categories: ['women'] },
  { name: 'JOYCE',          slug: 'joyce',            site_slug: 'joyce',           category: 'women', categories: ['women'] },
  { name: 'JULIANA OFFREDI',slug: 'juliana-offredi',  site_slug: 'juliana-offredi', category: 'women', categories: ['women'] },
  { name: 'KIARA',          slug: 'kiara',            site_slug: 'kiara',           category: 'women', categories: ['women'] },
  { name: 'MICHAELLA',      slug: 'mika',             site_slug: 'mika',            category: 'women', categories: ['women'] },
];

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const data   = body ? JSON.stringify(body) : null;
    const parsed = new URL(url);
    const mod    = parsed.protocol === 'https:' ? https : http;
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
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, body: buf }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n=== Criando ${MISSING.length} modelos faltantes ===\n`);

  for (const m of MISSING) {
    // 1. Criar modelo
    const create = await req('POST', `${PROD}/api/admin/models`, {
      name:       m.name,
      slug:       m.slug,
      category:   m.category,
      categories: JSON.stringify(m.categories),
      active: 1,
    });

    let modelId;
    if (create.status === 201 || create.status === 200) {
      modelId = create.body.id || create.body.model?.id;
      console.log(`  ✓ Criado: ${m.name} (id=${modelId})`);
    } else if (create.status === 409 || String(create.body).includes('UNIQUE')) {
      // Já existe — buscar id
      const list = await req('GET', `${PROD}/api/models?limit=200`, null);
      const models = Array.isArray(list.body) ? list.body : (list.body.models || []);
      const found = models.find(x => x.slug === m.slug);
      modelId = found?.id;
      console.log(`  ~ Já existe: ${m.name} (id=${modelId})`);
    } else {
      console.log(`  ✗ Erro ao criar ${m.name}: ${JSON.stringify(create.body).substring(0,80)}`);
      continue;
    }

    if (!modelId) { console.log(`  ✗ ID não encontrado para ${m.name}`); continue; }

    await sleep(400);

    // 2. Scrape das fotos
    const site_url = `https://andymodels.com/${m.site_slug}`;
    console.log(`  → Scraping ${site_url}...`);
    const scrape = await req('POST', `${PROD}/api/admin/models/${modelId}/scrape`, {
      page_url: site_url,
      replace: true,
    });

    if (scrape.status === 200) {
      const count = scrape.body.imported || scrape.body.count || '?';
      console.log(`    ✓ ${count} foto(s) importada(s)`);
    } else {
      console.log(`    ✗ Scrape falhou: ${JSON.stringify(scrape.body).substring(0,80)}`);
    }

    await sleep(1000);
  }

  console.log('\n=== Concluído ===');
}

main().catch(console.error);
