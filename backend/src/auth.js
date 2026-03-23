const { google } = require('googleapis');

function getAuth() {
  const subject = process.env.GOOGLE_SUBJECT_EMAIL || null;

  if (!subject) {
    throw new Error(
      'GOOGLE_SUBJECT_EMAIL não está definido. ' +
      'Domain-wide delegation requer o e-mail do usuário a ser impersonado.'
    );
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/presentations',
    ],
    subject,
  });

  return auth;
}

// Call this once per request to pre-authorize and confirm subject is applied.
// Returns the same auth instance — ready for Drive, Sheets, and Slides.
async function getAuthorizedAuth() {
  const auth = getAuth();
  await auth.authorize();
  return auth;
}

module.exports = { getAuth, getAuthorizedAuth };
