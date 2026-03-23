# CS Concepts Evaluation — Vercel Deployment

A timed evaluation platform for Customer Success onboarding. Scores are written to a Google Sheet automatically.

## Project Structure

```
├── index.html          # The test platform (static, served by Vercel)
├── api/
│   ├── auth.js         # GET  /api/auth?email=   — check if user started/submitted
│   ├── submit.js       # POST /api/submit        — record start or final submission
│   └── admin.js        # GET  /api/admin         — fetch all records for admin dashboard
├── package.json
└── README.md
```

## Google Sheet Setup

### 1. Create the sheet

Open the spreadsheet:
`https://docs.google.com/spreadsheets/d/1R59fKlQLcUIXQFxOLK_fUmfMkIlewi_g2cmVXvcuSRY`

Add a tab named exactly **`Responses`** with these headers in row 1:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Email | Name | StartTime | SubmitTime | Status | MCQScore | CaseScore | TotalScore | Passed | Date |

### 2. Share with your service account

- Open the spreadsheet → Share
- Add your service account email (e.g. `something@your-project.iam.gserviceaccount.com`)
- Give it **Editor** access

### 3. Enable Google Sheets API

In [Google Cloud Console](https://console.cloud.google.com):
- Go to **APIs & Services → Library**
- Search for **Google Sheets API** and enable it (in the same project as your service account)

## Vercel Environment Variables

In your Vercel project settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_EMAIL` | Service account email (e.g. `something@project.iam.gserviceaccount.com`) |
| `GOOGLE_PRIVATE_KEY` | The full private key from the service account JSON, including `-----BEGIN...` and `-----END...` |
| `SHEET_ID` | `1R59fKlQLcUIXQFxOLK_fUmfMkIlewi_g2cmVXvcuSRY` |
| `ADMIN_PASSWORD` | `adminarun123$` (or change this to something new) |

> **Tip for `GOOGLE_PRIVATE_KEY`:** Paste the raw value from the JSON key file. Vercel preserves literal `\n` in the value — the API functions handle this automatically.

## Deploy

### Option A — Vercel CLI

```bash
npm i -g vercel
cd /path/to/this/folder
vercel
```

Follow the prompts. On first deploy Vercel will ask you to link/create a project.

### Option B — GitHub

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import the repo
3. Add the environment variables above
4. Deploy

## Admin Access

Navigate to your deployed URL and click the lock icon (top-right corner).

- **Email:** `admin@anywhere.co`
- **Password:** `adminarun123$`

The admin dashboard shows all submissions with MCQ/Case/Total scores, pass/fail status, and incomplete attempts.
