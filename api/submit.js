import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const TAB = 'Responses';

// Row layout (1-indexed cols in Sheets, 0-indexed here):
// A=Email, B=Name, C=StartTime, D=SubmitTime, E=Status,
// F=MCQScore, G=CaseScore, H=TotalScore, I=Passed, J=Date,
// K=MCQAnswers (JSON: {questionId: selectedIndex}), L=CaseAnswers (JSON: {caseId: [selectedIndices]})

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function findRow(sheets, email) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A:A`,
  });
  const rows = result.data.values || [];
  const idx = rows.findIndex(
    (row) => (row[0] || '').toLowerCase() === email.toLowerCase()
  );
  return idx === -1 ? -1 : idx + 1; // 1-based sheet row number
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, action, startTime, mcqScore, caseScore, totalScore, passed, date, mcqAnswers, caseAnswers, submitType } =
    req.body || {};

  if (!email || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });

    if (action === 'start') {
      const existingRow = await findRow(sheets, email);
      if (existingRow !== -1) {
        // Already recorded — don't overwrite
        return res.status(200).json({ ok: true });
      }
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${TAB}!A:J`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[email, name || '', startTime || new Date().toISOString(), '', 'STARTED', '', '', '', '', '']],
        },
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'submit') {
      const rowNum = await findRow(sheets, email);
      const submitTime = new Date().toISOString();
      const row = [
        email,
        name || '',
        startTime || submitTime,
        submitTime,
        submitType === 'AUTO_SUBMITTED' ? 'AUTO_SUBMITTED' : 'SUBMITTED',
        mcqScore ?? '',
        caseScore ?? '',
        totalScore ?? '',
        passed ? 'YES' : 'NO',
        date || submitTime,
        mcqAnswers ? JSON.stringify(mcqAnswers) : '',
        caseAnswers ? JSON.stringify(caseAnswers) : '',
      ];

      if (rowNum !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${TAB}!A${rowNum}:L${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: `${TAB}!A:L`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] },
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'autosave') {
      const rowNum = await findRow(sheets, email);
      if (rowNum === -1) return res.status(200).json({ ok: true });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${TAB}!K${rowNum}:L${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            mcqAnswers ? JSON.stringify(mcqAnswers) : '',
            caseAnswers ? JSON.stringify(caseAnswers) : '',
          ]],
        },
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('submit error:', err.message);
    return res.status(500).json({ error: 'Failed to write to sheet' });
  }
}
