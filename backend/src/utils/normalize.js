function normalizar(txt) {
  return String(txt || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Safe partial match in both directions.
// Uses !== -1 explicitly — indexOf returns 0 when the match is at position 0,
// which is falsy in JS. Using !== -1 is the only correct check.
function nomeCompativel(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  return na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1;
}

module.exports = { normalizar, nomeCompativel };
