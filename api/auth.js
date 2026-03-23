import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const RESPONSES_TAB = 'Responses';
const ALLOWED_TAB = 'Authenticated Users';

// Responses row layout (0-indexed cols):
// A=Email, B=Name, C=StartTime, D=SubmitTime, E=Status, ...

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });

    // 1. Check Authenticated Users tab — is this person allowed to take the test?
    const allowedResult = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${ALLOWED_TAB}!A:B`,
    });
    const allowedRows = allowedResult.data.values || [];
    const allowedRow = allowedRows.find(
      (row) => (row[0] || '').toLowerCase() === email.toLowerCase()
    );

    if (!allowedRow) {
      return res.status(200).json({ authorized: false, exists: false, started: false, submitted: false });
    }
    const meetLink = allowedRow[1] || null;

    // 2. Check Responses tab — have they already started or submitted?
    const responsesResult = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${RESPONSES_TAB}!A:L`,
    });
    const rows = responsesResult.data.values || [];
    const match = rows.find(
      (row) => (row[0] || '').toLowerCase() === email.toLowerCase()
    );

    if (!match) {
      return res.status(200).json({ authorized: true, exists: false, started: false, submitted: false, meetLink });
    }

    const status = (match[4] || '').toUpperCase();
    return res.status(200).json({
      authorized: true,
      exists: true,
      started: status === 'STARTED' || status === 'SUBMITTED',
      submitted: status === 'SUBMITTED',
      name: match[1] || '',
      startTime: match[2] || null,
      mcqAnswers: match[10] || null,
      caseAnswers: match[11] || null,
      meetLink,
    });
  } catch (err) {
    console.error('auth error:', err.message);
    return res.status(500).json({ error: 'Failed to check status' });
  }
}
