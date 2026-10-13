# ISKER — Construction Project Dashboard

Web dashboard (with TV mode) for construction projects. Each project is a
Google Sheet; the dashboard reads it live and shows progress, budget, EVM
(CPI/SPI), milestones, and an optional site-camera feed.

Built with Expo (React Native Web) + a small Express server with PostgreSQL.

---

## How it works

```
 Browser ──────────────► Express server (server.js)
    │                      ├─ serves the built web app (dist/)
    │                      ├─ POST /api/auth       login (password → token)
    │                      └─ /api/sheets          list of connected sheets (PostgreSQL)
    │
    ├────────────────────► docs.google.com   (project data, read directly by the browser)
    └────────────────────► camera host        (optional, loaded in an <iframe>)
```

- The **server** only stores *which* Google Sheets are connected (table `sheets`)
  and handles the login. It never reads the sheets itself.
- The **project data** is fetched **by the user's browser** straight from Google
  Sheets. This means every computer/TV that opens the dashboard needs internet
  access to `docs.google.com`, not just the server.

---

## Requirements

- Node.js 20 or newer
- PostgreSQL (any recent version)
- A domain + HTTPS certificate in front of the server (recommended — see
  "Camera" below)

---

## Configuration

Set these as environment variables (see `.env.example`):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/isker` |
| `DATABASE_SSL` | no | Set to `false` if Postgres has no SSL (typical on-premise). Default: SSL on (needed for Render). |
| `APP_PASSWORD` | recommended | Dashboard login password. **If empty, login is disabled** and the app is open to anyone who can reach it. |
| `APP_SECRET` | recommended | Secret used to sign the login token. Use a long random string (`openssl rand -hex 32`). |
| `PORT` | no | Port to listen on. Default `3000`. |
| `EXPO_PUBLIC_API_BASE` | no | Native (iOS/Android) builds only: public URL of this server. Not needed for the web app. |

The server prints a warning at startup if `APP_PASSWORD` or `APP_SECRET` is missing.

---

## Install and run

```bash
npm ci                 # install exact versions from package-lock.json
npm run build          # builds the web app into ./dist  (re-run after code changes)
npm start              # starts the server (node server.js)
```

The database table is created automatically on first start. Check the log for
`✅ DB ready` and `ISKER running on port 3000`.

Keep the server running with a process manager (systemd, pm2, Docker, …) and put
a reverse proxy (nginx, IIS, …) with HTTPS in front of it.

Local development (hot reload):

```bash
npm run dev            # then press "w" for web
```

---

## Database

One table, created automatically:

```sql
CREATE TABLE sheets (
  id         TEXT PRIMARY KEY,      -- Google Sheet ID
  label      TEXT NOT NULL,         -- name shown on the tab
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

To move the data from another server: `pg_dump --table=sheets <source_db> | psql <target_db>`,
or simply re-add the sheets with the **Add Sheet** button in the dashboard.

---

## Google Sheets format

Each connected spreadsheet must be shared as **"Anyone with the link — Viewer"**.
Sheet ID = the long string in the sheet URL (`.../spreadsheets/d/<ID>/edit`).

The dashboard reads these tabs (names must match exactly). Row 1 = column
headers (exact names below, lowercase with underscores). A row is ignored if its
first column is empty. Columns marked *optional* may be missing.

| Tab | Columns |
|---|---|
| `Projects` | project_id, project_name, location, client, status, start_date, end_date, total_budget_usd, spent_to_date_usd, progress_pct, workers_count, equipment_count, cpi, spi, notes — *optional:* camera_url, cost_variance_usd, schedule_variance_days, deviation_status, plan_pct, fact_pct, deviation_pct (a column named `deviation` is also accepted) |
| `Schedule` | milestone_id, project_id, phase, milestone_name, planned_start, planned_end, actual_end, progress_pct, status, responsible — *optional:* total_qty, actual_completed |
| `Budget` | record_id, project_id, month, category, planned_usd, actual_usd, variance_usd |
| `EVM` | record_id, project_id, month, bac_usd, pv_usd, ev_usd, ac_usd, cpi, spi, cv_usd, sv_usd, eac_usd |
| `Workers` | worker_id, project_id, full_name, role, department, company, daily_rate_usd, start_date, status |
| `Equipment` | equipment_id, project_id, name, type, serial_id, owner, daily_cost_usd, assigned_date, status, last_service |
| `Issues` | issue_id, project_id, date_raised, title, category, priority, status, assigned_to, due_date, resolved_date, notes |
| `Daily Reports` | report_id, project_id, date, workers_present, equipment_active, work_summary, weather, incidents, submitted_by, notes |

Notes on the data:

- **Percent columns** (`plan_pct`, `fact_pct`, `deviation_pct`, …) may be
  formatted as percentages in the sheet (`0,29%`); the app converts them.
- **Milestone status** values used: `Done`, `In Progress`, `Pending`, `Delayed`.
  A milestone phase shows quantity-based progress (`actual_completed / total_qty`)
  when `total_qty` > 0, otherwise it falls back to the share of milestones with
  status `Done`.
- **EVM `month`** can be text (`2026-09`) or a real date cell.
- Google can take a short while to publish edits made in the sheet.

---

## Camera (optional)

Add a `camera_url` column to the `Projects` tab and put the URL in the project's
row. Projects without a URL show an empty "No feed connected" card.

- A normal URL (e.g. the MediaMTX WebRTC viewer page
  `https://camera.example.com:8889/cam1/`) is embedded as an `<iframe>`.
- A URL ending in `.m3u8` (HLS) is played with a plain `<video>` tag — this only
  works in Safari. Chrome/Firefox would need the `hls.js` package (not installed).
- Browsers cannot play `rtsp://` links directly; the stream has to be converted
  (e.g. with MediaMTX) and served over **HTTPS**. The dashboard must be served
  over HTTPS too, otherwise browsers block mixed content.
- WebRTC also needs its media (UDP) port reachable from the viewers' network,
  not only the HTTP port.

---

## Network checklist for the server

- Viewers' browsers can reach `https://docs.google.com`
- Viewers' browsers can reach the camera host/ports (if cameras are used)
- The server can reach PostgreSQL
- HTTPS certificate for the dashboard domain

---

## Security notes

- Login is a single shared password (`APP_PASSWORD`). The token is derived from
  `APP_SECRET`, is the same for every user, and does not expire. Changing
  `APP_SECRET` logs everyone out.
- Token and theme are stored in the browser's localStorage, so users must log in
  again after the dashboard moves to a new address.
- CORS is open (`*`) on the API.
- Never commit `.env` or real passwords.

---

## Moving from Render — checklist

1. Copy the repository (this folder).
2. Create a PostgreSQL database and set `DATABASE_URL` (and `DATABASE_SSL=false`
   if there is no SSL).
3. Set `APP_PASSWORD` and `APP_SECRET`.
4. `npm ci && npm run build && npm start`.
5. Re-create the sheet list (`pg_dump` of table `sheets`, or "Add Sheet").
6. Put HTTPS in front, point the TVs/bookmarks to the new address.
7. Keep Render running until login, project list, every project, TV mode and
   the camera have been checked on the new server.

`render.yaml` is only used by Render and can be ignored on the company server.

---

## Project structure

```
app/
  _layout.tsx        root layout, theme provider
  index.tsx          main screen: login, project tabs, dashboard, TV mode (web)
                     and project feed (mobile)
  project/[id].tsx   single-project screen used by the mobile layout
hooks/
  useSheetData.ts    Google Sheets fetching + data types
  useTheme.ts        light/dark theme (persisted)
  useStorage.ts      key-value storage wrapper (localStorage / AsyncStorage)
server.js            Express server: login, /api/sheets, serves dist/
render.yaml          Render deployment blueprint (not needed elsewhere)
public/, assets/     logos and icons
```
