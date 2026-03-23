import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const TAB = 'Responses';
const ADMIN_EMAIL = 'admin@anywhere.co';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'adminarun123$';
const TT_SECONDS = 2700; // 45 minutes — must match TT in index.html

// Row layout:
// A=Email, B=Name, C=StartTime, D=SubmitTime, E=Status,
// F=MCQScore, G=CaseScore, H=TotalScore, I=Passed, J=Date

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic auth check via query params (same credentials as the client-side admin panel)
  const { email, password } = req.query;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A:J`,
    });

    const rows = (result.data.values || []).filter((r) => r[0]); // skip empty rows

    const submitted = [];
    const started = [];

    for (const row of rows) {
      const [email, name, startTime, submitTime, status, mcqScore, caseScore, totalScore, passed, date] = row;
      const statusUp = (status || '').toUpperCase();

      if (statusUp === 'SUBMITTED' || statusUp === 'AUTO_SUBMITTED') {
        submitted.push({ email, name, startTime, submitTime, mcqScore, caseScore, totalScore, passed, date, submitType: statusUp });
      } else if (statusUp === 'STARTED') {
        const elapsed = startTime
          ? Math.floor((Date.now() - new Date(startTime)) / 1000)
          : 0;
        if (elapsed >= TT_SECONDS) {
          // Timer has expired server-side — treat as auto-submitted (browser never fired)
          submitted.push({
            email, name, startTime,
            submitTime: null,
            mcqScore: mcqScore || '0',
            caseScore: caseScore || '0',
            totalScore: totalScore || '0',
            passed: 'NO',
            date: null,
            submitType: 'AUTO_SUBMITTED',
          });
        } else {
          started.push({ email, name, startTime });
        }
      }
    }

    return res.status(200).json({ submitted, started });
  } catch (err) {
    console.error('admin error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
}
