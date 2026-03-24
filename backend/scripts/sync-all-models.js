#!/usr/bin/env node
const https = require('https');

const PROD  = 'https://site-uyyq.onrender.com';
const TOKEN = 'andy-secret-2025';

// Modelos novos que precisam ser criados (masculino)
const NEW_MEN = [
  { name: 'ALEXANDRE', slug: 'alexandre', site_slug: 'alexandre' },
  { name: 'ALVARO',    slug: 'alvaro',    site_slug: 'alvaro'    },
  { name: 'DANIEL',    slug: 'daniel',    site_slug: 'daniel'    },
  { name: 'PEDRO SOLTZ', slug: 'pedro-soltz', site_slug: 'pedro-soltz' },
  { name: 'RICARDO',   slug: 'ricardo',   site_slug: 'ricardo'   },
];

// Slugs errados que precisam ser corrigidos (db_slug → correct_slug)
const SLUG_FIXES = [
  { db_slug: 'luan-coradini', correct_slug: 'luancoradini' },
  { db_slug: 'rafa-santos',   correct_slug: 'rafasantos'   },
  { db_slug: 'vitor-badiani', correct_slug: 'vitorbadiani' },
];

// Models que precisam da categoria "creators" adicionada
const CREATORS = ['gaia','luara-maian','giovanna','naira','vivi','mika','beatriz-schwan',
  'mariane-fassarella','alika-vieira','andrya-turini','bea-estevam','juliana-offredi',
  'rafasantos','alvaro','santiago','riccardo-delpozzo','lucas-pazolini','vitor-melo',
  'antonello','wendel','andre','leonan-campos','mateus-seidel','pedro-soltz',
  'santi-wainw','vitorbadiani'];

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'site-uyyq.onrender.com', port: 443,
      path, method,
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

async function getAllModels() {
  const r = await api('GET', '/api/models?limit=200', null);
  return Array.isArray(r.body) ? r.body : (r.body.models || []);
}

async function main() {
  const models = await getAllModels();
  const bySlug = {};
  models.forEach(m => bySlug[m.slug] = m);

  // ── 1. Criar modelos masculinos novos ──────────────────────────────────────
  console.log('\n=== 1. Criando novos modelos masculinos ===');
  for (const m of NEW_MEN) {
    if (bySlug[m.slug]) { console.log(`  ~ ${m.name} já existe`); continue; }
    const r = await api('POST', '/api/admin/models', {
      name: m.name, slug: m.slug, category: 'men',
      categories: JSON.stringify(['men']), active: 1,
    });
    if (r.status === 201 || r.status === 200) {
      const id = r.body.id || r.body.model?.id;
      console.log(`  ✓ Criado: ${m.name} (id=${id})`);
      bySlug[m.slug] = { ...r.body, id, slug: m.slug };
      await sleep(300);
      // Scrape fotos
      const s = await api('POST', `/api/admin/models/${id}/scrape`, {
        page_url: `https://andymodels.com/${m.site_slug}`, replace: true,
      });
      console.log(`    → fotos: ${s.body.imported || s.body.count || JSON.stringify(s.body).substring(0,40)}`);
    } else {
      console.log(`  ✗ Erro ${m.name}: ${JSON.stringify(r.body).substring(0,60)}`);
    }
    await sleep(800);
  }

  // ── 2. Corrigir slugs errados ──────────────────────────────────────────────
  console.log('\n=== 2. Corrigindo slugs ===');
  // Reload
  const all = await getAllModels();
  all.forEach(m => bySlug[m.slug] = m);

  for (const fix of SLUG_FIXES) {
    const model = bySlug[fix.db_slug];
    if (!model) { console.log(`  ? ${fix.db_slug} não encontrado`); continue; }
    const r = await api('PUT', `/api/admin/models/${model.id}`, {
      ...model,
      slug: fix.correct_slug,
      categories: JSON.stringify(model.categories || [model.category]),
    });
    if (r.status === 200) {
      console.log(`  ✓ ${fix.db_slug} → ${fix.correct_slug}`);
      bySlug[fix.correct_slug] = { ...model, slug: fix.correct_slug };
      delete bySlug[fix.db_slug];
    } else {
      console.log(`  ✗ Erro: ${JSON.stringify(r.body).substring(0,60)}`);
    }
    await sleep(300);
  }

  // ── 3. Adicionar categoria creators onde necessário ────────────────────────
  console.log('\n=== 3. Atualizando categoria creators ===');
  const allModels = await getAllModels();
  allModels.forEach(m => bySlug[m.slug] = m);

  for (const slug of CREATORS) {
    const model = bySlug[slug];
    if (!model) { console.log(`  ? ${slug} não encontrado`); continue; }

    let cats = [];
    try { cats = JSON.parse(model.categories || '[]'); } catch { cats = [model.category]; }
    if (cats.includes('creators')) { continue; } // já tem

    cats = [...new Set([...cats, 'creators'])];
    const r = await api('PUT', `/api/admin/models/${model.id}`, {
      ...model,
      categories: JSON.stringify(cats),
    });
    if (r.status === 200) {
      console.log(`  ✓ creators adicionado: ${model.name}`);
    } else {
      console.log(`  ✗ ${model.name}: ${JSON.stringify(r.body).substring(0,60)}`);
    }
    await sleep(150);
  }

  // ── Resultado final ────────────────────────────────────────────────────────
  console.log('\n=== RESULTADO FINAL ===');
  const final = await getAllModels();
  const women = final.filter(m => JSON.stringify(m.categories||'').includes('"women"') || m.category==='women');
  const men   = final.filter(m => JSON.stringify(m.categories||'').includes('"men"') && !JSON.stringify(m.categories||'').includes('"women"'));
  const creators = final.filter(m => JSON.stringify(m.categories||'').includes('"creators"'));
  console.log(`Women: ${women.length} | Men: ${men.length} | Creators: ${creators.length} | Total: ${final.length}`);
}

main().catch(console.error);
