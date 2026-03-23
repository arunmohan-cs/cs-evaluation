import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const TAB = 'Responses';

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// Row layout (0-indexed cols):
// A=Email, B=Name, C=StartTime, D=SubmitTime, E=Status, F=MCQScore, G=CaseScore, H=TotalScore, I=Passed, J=Date

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
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A:E`,
    });

    const rows = result.data.values || [];
    const match = rows.find(
      (row) => (row[0] || '').toLowerCase() === email.toLowerCase()
    );

    if (!match) {
      return res.status(200).json({ exists: false, started: false, submitted: false });
    }

    const status = (match[4] || '').toUpperCase();
    return res.status(200).json({
      exists: true,
      started: status === 'STARTED' || status === 'SUBMITTED',
      submitted: status === 'SUBMITTED',
      name: match[1] || '',
    });
  } catch (err) {
    console.error('auth error:', err.message);
    return res.status(500).json({ error: 'Failed to check status' });
  }
}
