# GrowEasy CSV → CRM Importer

An AI-powered CSV importer that ingests **any** lead export — Facebook Lead Ads,
Google Ads, Excel sheets, real-estate CRM exports, hand-made spreadsheets,
whatever — and intelligently maps it into GrowEasy's fixed CRM schema using
Google Gemini.

Built for the GrowEasy Software Developer assignment.

```
groweasy-csv-importer/
├── backend/            Node.js + Express + TypeScript API
├── frontend/            Next.js 15 + TypeScript + Tailwind UI
├── docker-compose.yml    Run both services together
└── README.md
```

## How it works

1. **Upload** — user drags/drops or picks a `.csv` file.
2. **Preview** — the file is parsed *entirely client-side* (Papa Parse) and shown
   in a scrollable, sticky-header table. **No AI call happens at this stage.**
3. **Confirm** — only when the user clicks "Confirm import" does the frontend
   send the file to the backend.
4. **AI mapping** — the backend re-parses the CSV, splits rows into batches,
   and sends each batch to Gemini with a prompt that describes GrowEasy's
   target schema, the allowed enum values, and the field-mapping rules from
   the assignment (multiple emails/phones, notes consolidation, date format,
   skip rule, etc).
5. **Result** — the frontend shows imported records and skipped records
   (with a reason for each skip) in a second table, plus summary counts.

---

## 1. Prerequisites

- Node.js 18+
- A Google Gemini API key — get one free at https://aistudio.google.com/app/apikey

---

## 2. Local setup

### Backend

```bash
cd backend
cp .env.example .env
# edit .env and set GEMINI_API_KEY=your_key_here
npm install
npm run dev
```

Backend runs at `http://localhost:8080`. Verify with:

```bash
curl http://localhost:8080/health
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080 (already the default)
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## 3. Testing the flow

Two ready-made sample files are in `backend/sample-data/`:

- `sample-standard.csv` — already in GrowEasy's own format (sanity check).
- `sample-facebook-export.csv` — a messy Facebook-style export with different
  column names, combined name/email fields, multiple phone numbers, and one
  row with no contact info at all (should be skipped).

Upload either file at `http://localhost:3000`, preview it, confirm, and check
the AI-mapped result table.

### Manual API testing (curl)

```bash
# Step 2 — preview only, no AI
curl -X POST http://localhost:8080/api/import/preview \
  -F "file=@backend/sample-data/sample-facebook-export.csv"

# Step 3/4 — full AI import
curl -X POST http://localhost:8080/api/import/confirm \
  -F "file=@backend/sample-data/sample-facebook-export.csv"
```

### Sample API response (`/api/import/confirm`)

```json
{
  "success": true,
  "data": {
    "importedRecords": [
      {
        "created_at": "2026-06-01T10:15:00Z",
        "name": "Amit Kumar",
        "email": "amit.kumar@gmail.com",
        "country_code": "+91",
        "mobile_without_country_code": "919845012345",
        "company": "",
        "city": "Hyderabad",
        "state": "",
        "country": "India",
        "lead_owner": "",
        "crm_status": "GOOD_LEAD_FOLLOW_UP",
        "crm_note": "",
        "data_source": "meridian_tower",
        "possession_time": "",
        "description": "Wants a callback next week for site visit"
      }
    ],
    "skippedRecords": [
      {
        "row": { "Full name": "", "Email": "no-email-here", "Phone number": "" },
        "reason": "No valid email or mobile number found",
        "rowIndex": 2
      }
    ],
    "totalRows": 4,
    "totalImported": 3,
    "totalSkipped": 1,
    "batches": 1
  }
}
```

---

## 4. Environment variables

### `backend/.env`

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `8080` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origin(s) | `http://localhost:3000` |
| `GEMINI_API_KEY` | **Required.** Your Gemini API key | — |
| `GEMINI_MODEL` | Gemini model name | `gemini-1.5-flash` |
| `AI_BATCH_SIZE` | Rows per AI batch | `10` |
| `AI_MAX_RETRIES` | Retries per failed batch | `3` |
| `AI_RETRY_DELAY_MS` | Base retry backoff | `1000` |
| `MAX_FILE_SIZE_MB` | Max upload size | `10` |

### `frontend/.env.local`

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:8080` |

---

## 5. Docker (run everything with one command)

```bash
# from the project root
export GEMINI_API_KEY=your_key_here
docker compose up --build
```

Frontend → `http://localhost:3000`, backend → `http://localhost:8080`.

---

## 6. GitHub

```bash
cd groweasy-csv-importer
git init
git add .
git commit -m "GrowEasy AI CSV Importer - initial submission"
git branch -M main
git remote add origin https://github.com/<your-username>/groweasy-csv-importer.git
git push -u origin main
```

---

## 7. Deployment

### Frontend → Vercel

1. Push this repo to GitHub (see above).
2. On https://vercel.com → **New Project** → import the repo.
3. Set **Root Directory** to `frontend`.
4. Add environment variable `NEXT_PUBLIC_API_URL` = your deployed backend URL
   (e.g. `https://groweasy-backend.onrender.com`).
5. Deploy. Vercel auto-detects Next.js — no extra build config needed.

### Backend → Render

1. On https://render.com → **New** → **Web Service** → connect the repo.
2. Set **Root Directory** to `backend`.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables from the table above (`GEMINI_API_KEY` is required).
6. Once deployed, copy the Render URL into the frontend's `NEXT_PUBLIC_API_URL`
   and redeploy the frontend (or set it before the first deploy).
7. Update the backend's `CORS_ORIGIN` to the deployed Vercel URL and redeploy.

---

## 8. Design notes / assumptions

- **Preview is 100% client-side.** The spec requires no AI processing before
  confirmation, so parsing for the preview table uses Papa Parse in the
  browser. The file is re-sent to the backend on confirm, which re-parses it
  server-side (source of truth) before the AI step.
- **Batching is sequential**, not parallel, to stay within Gemini rate limits
  on a free-tier key. `AI_BATCH_SIZE` and retry behavior are configurable via
  env vars.
- **Enum safety net:** even though the prompt instructs Gemini to only return
  allowed `crm_status` / `data_source` values, the backend re-validates every
  returned value against the whitelist server-side and blanks anything that
  doesn't match — the AI is trusted for mapping, never for schema enforcement.
- **Skip rule** (no email AND no mobile) is enforced in code, not just via
  prompt instructions, so a hallucinating model can't accidentally let bad
  rows through.
- Stateless by design — no database. Every request is processed and returned
  in one round trip, matching the "Database optional" note in the spec.

---

## 9. Tech stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Papa Parse
- **Backend:** Node.js, Express, TypeScript, Multer, csv-parse
- **AI:** Google Gemini (`@google/generative-ai`)
- **Deployment:** Vercel (frontend), Render (backend), Docker for local/prod parity
