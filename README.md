# Investment Dashboard

> Static web app for NRI investors — property modeling + US stock tracking. Frontend on GitHub Pages; private data in MongoDB Atlas.

---

## Quick start

| Step | Action |
|------|--------|
| 1 | Open `index.html` locally, or use the GitHub Pages URL after deploy |
| 2 | Property calculator loads by default; click the **header title** to switch to stocks |
| 3 | **Settings** (⚙) → add Alpha Vantage API key for live prices |

---

## Dashboards

| Dashboard | Access | Purpose |
|-----------|--------|---------|
| Property Investment Calculator | Default on load | Loan, prepayment, appreciation, break-even, opportunity cost |
| US Stock Portfolio | Click header title | Live holdings, performance, allocation |

---

## Property calculator

### Profiles

| Action | How |
|--------|-----|
| Add | **+** in profile bar (max 10) |
| Switch | Click profile pill |
| Rename / duplicate / delete | Hover pill → icon |

Each profile stores sliders, rental, payment mode, CLP schedule, horizon, and active tab independently.

### Payment mode

| Mode | Use when |
|------|----------|
| **OTP** (Ready to Move) | Full payment at purchase; loan starts immediately |
| **CLP** (Under Construction) | Cash in tranches; loan at possession |

### Tab — Financing

| Input | Range | Description |
|-------|-------|-------------|
| Property value | ₹25 L – ₹5 Cr | Purchase price |
| Cash payment | ₹0 – property value | Down payment |
| Loan amount | ₹0 – property value | Auto-syncs: cash + loan = property value |
| Interest rate | 7% – 12% | Step 0.25%; annual |
| Total monthly payment | EMI floor – ₹10 L | Excess above EMI = prepayment |

| Metric | Description |
|--------|-------------|
| Base EMI | 20-year term at chosen rate |
| Payoff In | Months to clear loan with prepayments |
| Total Interest | Interest over accelerated schedule |
| Interest Saved | vs 20-year no-prepay baseline |
| Total Outflow | Cash + principal + interest |

| Chart line | Meaning |
|------------|---------|
| Blue | Balance with prepayments |
| Red dashed | 20-year baseline (no prepay) |
| Green shaded band | Interest saved vs no-prepay baseline |

### Tab — Returns

| Input | Range | Description |
|-------|-------|-------------|
| Appreciation rate | 0% – 20% p.a. | Annual property growth |
| Monthly rental | Any | Offsets cumulative outflow |
| Time horizon | 3 / 5 / 10 yr | Horizon metric cards |
| Alt. investment return | 4% – 20% p.a. | Return rate for the Invest & Defer scenario (NIFTY ~12%, FD ~7%) |
| Monthly SIP / Lump-sum | Derived | Displays investable amount (EMI − rent) and down-payment lump-sum |

| Metric | Description |
|--------|-------------|
| At Loan End | Property value + net equity when loan paid off |
| At N-Year Mark | Value + equity at chosen horizon |
| Recoup Down Payment | When net equity ≥ initial cash |
| Rental at N yr | Cumulative rent by horizon |

**Invest & Defer Comparison** *(at loan payoff)*

| Card | Description |
|------|-------------|
| Corpus at Payoff | Value of investing the same monthly budget in equity/MF at the alt. return rate |
| Rent Paid (total) | Cumulative rent paid over the loan period |
| Net Corpus | Corpus − total rent paid |
| Property Then | Appreciated property price at loan payoff |
| Surplus / Deficit | Net corpus vs property price; verdict shows which strategy wins |

| Chart toggle / element | Meaning |
|------------------------|---------|
| Equity view | Net equity to zero baseline — green fill above, red below |
| Buy vs Invest view | Buy-now net worth vs invest-and-defer net worth |
| Green fill / line | Net equity gain or buy-now ahead |
| Red fill | Net equity deficit |
| Purple line | Invest & defer net worth |
| Green / purple band | Which strategy leads between the two lines |
| Dashed vertical (purple) | Month invest & defer overtakes buy now |
| Dashed vertical (blue) | Loan end |
| Markers | Net equity at 3 / 5 / 10 yr |

### Tab — Compare

*(2+ profiles only)* Bubble chart: x = years to recoup down payment · y = net equity at horizon · bubble size = cash invested. **Active profile** has a thicker ring; dashed **y = 0** line marks break-even equity.

### CLP tranche schedule

*(CLP mode only)* Each row: **Label** · **%** of cash (must sum to 100%) · **Month** from today. Possession date auto-locks the final tranche. Use **+ Add Tranche**, **✕** to remove, or **Equal Split** preset.

---

## Stock portfolio

### Summary cards

| Card | Description |
|------|-------------|
| Portfolio Value | Current market value |
| Total Invested | Cost basis |
| Total Return | $ and % gain/loss |
| Today's Gain | Day-over-day change |
| Positions | Holding count |

### Charts

| Chart | Description |
|-------|-------------|
| Portfolio P&L | Daily or monthly return % — green fill above zero (gain), red below (loss) |
| Holdings Allocation | Doughnut by market value; segment color = return direction (green up, red down, grey flat) |

### Holdings table

| Column | Description |
|--------|-------------|
| Ticker | Symbol |
| Company | Name |
| Shares | Quantity (fractional OK) |
| Avg Cost | Average buy price ($) |
| Current | Live quote |
| Mkt Value | Shares × current |
| Return $ / % | vs cost basis |
| Actions | Edit / delete |

### Add / edit stock

| Field | Description |
|-------|-------------|
| Ticker or name | Alpha Vantage autocomplete |
| Company | Auto-filled; editable |
| Shares | Quantity |
| Price per share ($) | Average cost |
| Purchase date | Acquisition date |

Duplicate tickers **merge** (weighted average cost, combined shares).

---

## Shared

### Currency (property only)

| Control | Description |
|---------|-------------|
| INR / USD | Toggle display currency |
| Exchange rate | Custom ₹/$ (default 93) |

### Settings

| Setting | Description |
|---------|-------------|
| Alpha Vantage Key 1 / 2 | Primary + fallback (25 req/day each free tier) |
| Export All Data | JSON backup (local file — never commit to git) |
| Import Data | Restore from export |
| Sync now | Push current data to MongoDB cloud |
| Clear API Cache | Force fresh price fetch |

Keys: [alphavantage.co](https://www.alphavantage.co/support/#api-key)

### Persistence

| Layer | Contents |
|-------|----------|
| **MongoDB Atlas** (prod) | Private cloud copy via `server/` API — settings, profiles, holdings, P&L history |
| **`localStorage`** (browser) | Local cache + API price cache (`av_*`) |
| **JSON export** | Manual backup only — keep off GitHub (`portfolio_data_*.json` is gitignored) |

| `localStorage` key | Contents |
|-----|----------|
| `property_profiles` | Property profiles + CLP data |
| `stock_holdings` | Stock positions |
| `stock_pnl_history` | Daily P&L snapshots for stock performance chart |
| `app_settings` | API keys, exchange rate |
| `av_*` | Cached API responses |

---

## Maths

| Concept | Logic |
|---------|-------|
| Base EMI | Reducing balance, 240-month term |
| Prepayment | `extra = total monthly payment − EMI` → principal |
| Net equity | `property value − cumulative outflow − loan balance` |
| Break-even | First month net equity > 0 |
| Recoup down payment | First month net equity ≥ cash paid |
| CLP | Value = 0 until possession; then full value + appreciation |
| Invest & Defer corpus | SIP of `(EMI − rent)` + lump-sum of down payment, compounded at alt. return rate |
| Stock merge | Weighted average cost on duplicate ticker |

---

## Files

| File | Description |
|------|-------------|
| `index.html` | App shell (markup only) |
| `css/base.css`, `css/property.css`, `css/stock.css` | Styles |
| `js/00-config.js` … `js/07-init.js` | App logic (load order matters) |
| `server/` | Node API for MongoDB Atlas cloud sync |
| `render.yaml` | Render.com deploy blueprint for the API |
| `README.md` | This reference |
| `portfolio_data_<date>.json` | Export output (**gitignored** — never commit) |

Chart.js 4.4.1 via CDN. No npm install for the frontend.

---

## Production deploy

| Component | Host | Trigger |
|-----------|------|---------|
| Frontend | GitHub Pages | Push to `main` → `.github/workflows/deploy-prod.yml` |
| API | [Render.com](https://render.com) | `render.yaml` + deploy hook |
| Database | MongoDB Atlas | Connection string in Render env |

1. MongoDB Atlas → cluster, DB user, Network Access (`0.0.0.0/0` for Render).
2. Render Web Service from this repo (`server/`).
3. GitHub → Settings → Pages → Source: **GitHub Actions**.
4. GitHub → Settings → Environments → **prod** → add secrets/variables below.
5. Push to `main`.

Prod login validates against **`AUTH_PASSWORD_HASH`** on the server (not the client hash).
