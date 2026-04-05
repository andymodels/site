const https = require('https');
const http  = require('http');

const API   = process.env.API_URL || 'http://localhost:3001';
const TOKEN = process.env.ADMIN_TOKEN || 'andy-secret-token-fase1';

// Slug mapping: some slugs differ between old site and our DB
// Format: { dbSlug: 'site-slug' } — add overrides as needed
const SLUG_OVERRIDES = {
  'alika-vieira':       'alika-vieira',
  'aline-oliveira-1':   'aline-oliveira',
  'bea-estevam':        'bea-estevam',
  'fe-luppi':           'fe-luppi',
  'flavio-montak':      'flavio-montak',
  'gui-costa':          'gui-costa',
  'guillaume-babouin':  'guillaume-babouin',
  'igor-costalonga':    'igor-costalonga',
  'lara-bernardi':      'lara-bernardi',
  'lara-luchi':         'lara-luchi',
  'laryssa-castro':     'laryssa-castro',
  'leandro-d':          'leandro-d',
  'leonan-campos':      'leonan-campos',
  'luan-coradini':      'luan-coradini',
  'luara-maian':        'luara-maian',
  'lucas-delboni':      'lucas-delboni',
  'lucas-pazolini':     'lucas-pazolini',
  'mariane-fassarella': 'mariane-fassarella',
  'nathalia-ellen':     'nathalia-ellen',
  'rafa-santos':        'rafa-santos',
  'riccardo-delpozzo':  'riccardo-delpozzo',
  'santi-wainw':        'santi-wainw',
  'tiago-garcia':       'tiago-garcia',
  'vitor-badiani':      'vitor-badiani',
  'vitor-melo':         'vitor-melo',
  'andre-brunelli':     'andre-brunelli',
  'daniel-amorim':      'daniel-amorim',
  'isabela-landes':     'isabela-landes',
  'amanda-piffer':      'amanda-piffer',
  'ana-santos':         'ana-santos',
  'andrya-turini':      'andrya-turini',
  'beatriz-leite':      'beatriz-leite',
  'beatriz-schwan':     'beatriz-schwan',
  'dani-tagliaferro':   'dani-tagliaferro',
  'flavia-pedroni':     'flavia-pedroni',
};

function get(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data   = JSON.stringify(body);
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Authorization':  `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = client.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function checkPageExists(siteSlug) {
  try {
    const r = await get(`https://andymodels.com/${siteSlug}`);
    return r.status === 200;
  } catch { return false; }
}

async function main() {
  // Get all models from API
  const { body } = await get(`${API}/api/models`);
  const models = JSON.parse(body);
  console.log(`\n=== Importação em lote — ${models.length} modelos ===\n`);

  const results = { ok: [], notFound: [], failed: [] };

  for (const model of models) {
    const siteSlug = SLUG_OVERRIDES[model.slug] || model.slug;
    const pageUrl  = `https://andymodels.com/${siteSlug}`;

    process.stdout.write(`[${model.name}] Verificando ${pageUrl} ... `);

    const exists = await checkPageExists(siteSlug);
    if (!exists) {
      console.log('NÃO ENCONTRADO no site');
      results.notFound.push({ name: model.name, slug: siteSlug });
      continue;
    }

    try {
      const r = await post(`${API}/api/admin/models/${model.id}/scrape`, {
        page_url: pageUrl,
        replace: true,
      });
      const data = JSON.parse(r.body);
      if (data.error) throw new Error(data.error);
      console.log(`OK — ${data.imported} foto(s) importada(s)`);
      results.ok.push({ name: model.name, imported: data.imported });
    } catch (e) {
      console.log(`ERRO — ${e.message}`);
      results.failed.push({ name: model.name, error: e.message });
    }

    // Small delay to avoid overwhelming the CDN
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n=== RESULTADO FINAL ===');
  console.log(`✓ Importados com sucesso: ${results.ok.length}`);
  console.log(`✗ Não encontrados no site: ${results.notFound.length}`);
  console.log(`✗ Falhas: ${results.failed.length}`);

  if (results.notFound.length) {
    console.log('\nNão encontrados:');
    results.notFound.forEach(m => console.log(`  - ${m.name} (tentou: ${m.slug})`));
  }
  if (results.failed.length) {
    console.log('\nFalhas:');
    results.failed.forEach(m => console.log(`  - ${m.name}: ${m.error}`));
  }
  console.log('\nFinalizado.\n');
}

main().catch(console.error);
