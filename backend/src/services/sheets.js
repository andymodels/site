const { google } = require('googleapis');
const { nomeCompativel } = require('../utils/normalize');

async function _fetchRows(auth, gender) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId =
    gender === 'FEMININO'
      ? process.env.PLANILHA_FEMININO_ID
      : process.env.PLANILHA_MASCULINO_ID;

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'A:J' });
  return res.data.values || [];
}

// FEMININO:  A=Nome B=Altura C=Busto  D=Cintura E=Quadril F=Manequim G=Sapatos H=Cabelos I=Olhos J=Link
// MASCULINO: A=Nome B=Altura C=Tórax  D=Terno   E=Camisa  F=Manequim G=Sapatos H=Cabelos I=Olhos J=Link
function _rowToModel(row, gender) {
  const isMasc = gender === 'MASCULINO';
  const raw = isMasc ? {
    altura:   row[1] || '',
    torax:    row[2] || '',
    terno:    row[3] || '',
    camisa:   row[4] || '',
    manequim: row[5] || '',
    sapatos:  row[6] || '',
    cabelos:  row[7] || '',
    olhos:    row[8] || '',
  } : {
    altura:   row[1] || '',
    busto:    row[2] || '',
    cintura:  row[3] || '',
    quadril:  row[4] || '',
    manequim: row[5] || '',
    sapatos:  row[6] || '',
    cabelos:  row[7] || '',
    olhos:    row[8] || '',
  };

  return { name: row[0], gender, measurements: { raw } };
}

async function getAllModels(auth, gender) {
  const rows = await _fetchRows(auth, gender);
  return rows.slice(1).filter((r) => r[0]).map((r) => _rowToModel(r, gender));
}

async function getModelMeasurements(auth, gender, modelName) {
  const rows = await _fetchRows(auth, gender);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && nomeCompativel(rows[i][0], modelName)) {
      return _rowToModel(rows[i], gender).measurements;
    }
  }
  return null;
}

module.exports = { getModelMeasurements, getAllModels };
