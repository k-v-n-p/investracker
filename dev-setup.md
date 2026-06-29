# Dev setup

## Requirements

Node 20+, Git, MongoDB Atlas (free), [Render](https://render.com) account.

## Local — frontend only

1. Clone the repo, open `index.html` in a browser.
2. Login: `password` (default hash in `js/01-login.js`).
3. Optional: Alpha Vantage keys in **Settings** for live stock prices.

`js/00-config.js` with `API_URL: ''` → data stays in `localStorage`.

## Local — frontend + API

```bash
cd server
cp .env.example .env   # fill in values below
npm install
npm run dev
```

Set `API_URL: 'http://localhost:3000'` in `js/00-config.js`, reload frontend.  
Health check: `http://localhost:3000/api/health` → `{"ok":true,"db":true}`

## Environment variables

| Variable | Local (`server/.env`) | Render API | Notes |
|----------|----------------------|------------|-------|
| `MONGODB_URI` | ✓ | ✓ (prompt) | Atlas connection string, DB path e.g. `/investracker` |
| `JWT_SECRET` | ✓ | auto-generated | `openssl rand -hex 32` locally |
| `AUTH_PASSWORD_HASH` | ✓ | ✓ (prompt) | SHA-256 hex of login password (see below) |
| `CORS_ORIGIN` | `http://localhost:5500` | auto from static site | Comma-separated origins OK |
| `USER_ID` | optional (`owner`) | optional | Single-user app |
| `API_URL` | `js/00-config.js` | auto (static build) | Empty = local-only mode |

**Password hash** — browser console:

```javascript
crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourPassword'))
  .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
```

## Production (Render)

Both frontend and API deploy from `render.yaml` on push to `main`. No GitHub Actions or Pages needed.

1. **Atlas** — M0 cluster, DB user, network access (`0.0.0.0/0` for Render), copy connection string.
2. **Render** → **New** → **Blueprint** → connect repo → **Apply**.
3. When prompted, set `MONGODB_URI` and `AUTH_PASSWORD_HASH`.
4. After deploy:
   - Frontend: `https://investracker.onrender.com` (or your service name)
   - API: `https://investracker-api.onrender.com/api/health`

`CORS_ORIGIN` and frontend `API_URL` are wired between services in the blueprint.

## Verify

| Check | Expected |
|-------|----------|
| API `/api/health` | `{"ok":true,"db":true}` |
| Frontend loads | Dashboard visible |
| Login | Production password works |
| Cloud sync | Settings shows sync enabled; edits save to cloud |

## Do not commit

`server/.env`, `portfolio_data_*.json`, `server/node_modules/` — listed in `.gitignore`.
