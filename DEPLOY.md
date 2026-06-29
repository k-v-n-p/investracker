# GitHub `prod` environment — secrets & variables

Configure at: **Repository → Settings → Environments → prod**

## Secrets (encrypted)

| Name | Used by | Value |
|------|---------|-------|
| `RENDER_DEPLOY_HOOK` | GitHub Actions (`deploy-prod.yml`) | Render dashboard → your web service → **Settings → Deploy Hook** → copy URL |

## Variables (plain text, not secret)

| Name | Used by | Example value |
|------|---------|---------------|
| `API_URL` | GitHub Actions (injected into `js/00-config.js`) | `https://investracker-api.onrender.com` |

---

## Render.com environment variables

Set these on the **Render Web Service** (same values as Atlas / auth — not stored in the public repo):

| Name | Required | Description |
|------|----------|-------------|
| `MONGODB_URI` | Yes | Atlas connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/investracker?retryWrites=true&w=majority` |
| `JWT_SECRET` | Yes | Random string, e.g. run `openssl rand -hex 32` |
| `AUTH_PASSWORD_HASH` | Yes | SHA-256 hex of your dashboard password (see below) |
| `CORS_ORIGIN` | Yes | `https://k-v-n-p.github.io` (your GitHub Pages origin, no trailing path) |
| `USER_ID` | No | Defaults to `owner` (single-user app) |
| `PORT` | No | Render sets automatically |

### Generate `AUTH_PASSWORD_HASH`

In the browser console:

```javascript
crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourPassword'))
  .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
```

Use the same password when logging into the deployed dashboard.

---

## MongoDB Atlas checklist

1. **Database** → Create database `investracker` (or any name — URI path sets it).
2. **Database Access** → user with read/write on that database.
3. **Network Access** → allow Render (often `0.0.0.0/0` initially, tighten later).
4. **Connect** → Drivers → copy connection string → replace password → `MONGODB_URI`.

---

## After setup

- Frontend: `https://k-v-n-p.github.io/investracker/`
- API health: `https://YOUR-RENDER-URL.onrender.com/api/health`
- Data auto-syncs ~1.5s after changes; use **Settings → Sync now** for immediate push.
