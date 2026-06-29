# Investment Dashboard

> Static multi-file web app for NRI investors — Hyderabad property modeling + US stock tracking. No server or build step.

---

## Quick start

| Step | Action |
|------|--------|
| 1 | Open `index.html` in Chrome, Edge, or Firefox (or deploy to GitHub Pages) |
| 2 | Property calculator loads by default; click the **header title** to switch to stocks |
| 3 | **Settings** (⚙) → add Alpha Vantage API key for live prices |

---

## Dashboards

| Dashboard | Access | Purpose |
|-----------|--------|---------|
| Property Investment Calculator | Default on load | Loan, prepayment, appreciation, break-even |
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

### Tab — Returns

| Input | Range | Description |
|-------|-------|-------------|
| Appreciation rate | 0% – 20% p.a. | Annual property growth |
| Monthly rental | Any | Offsets cumulative outflow |
| Time horizon | 3 / 5 / 10 yr | Horizon metric cards |

| Metric | Description |
|--------|-------------|
| At Loan End | Property value + net equity when loan paid off |
| At N-Year Mark | Value + equity at chosen horizon |
| Recoup Down Payment | When net equity ≥ initial cash |
| Rental at N yr | Cumulative rent by horizon |

| Chart element | Meaning |
|---------------|---------|
| Green line | Property value (appreciating) |
| Orange line | Cost basis (cash out + loan balance) |
| Yellow dot | Break-even |
| Dashed vertical | Loan end |
| Markers | Net equity at 3 / 5 / 10 yr |

### CLP tranche schedule

*(CLP mode only)*

| Field | Description |
|-------|-------------|
| Label | Milestone name |
| % | Share of cash (must sum to 100%) |
| Month | Due date (months from today) |
| Possession date | Locks final tranche month |

| Action | How |
|--------|-----|
| Add tranche | **+ Add Tranche** |
| Remove | **✕** on row (not final) |
| Equal split | Preset N equal payments to possession |

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
| Portfolio Performance | Last ~100 trading days |
| Holdings Allocation | Doughnut by market value |

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
| Export All Data | JSON snapshot (profiles + holdings) |
| Import Data | Restore from export |
| Clear API Cache | Force fresh price fetch |

Keys: [alphavantage.co](https://www.alphavantage.co/support/#api-key)

### Persistence (`localStorage`)

| Key | Contents |
|-----|----------|
| `property_profiles` | Property profiles + CLP data |
| `stock_holdings` | Stock positions |
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
| Stock merge | Weighted average cost on duplicate ticker |

---

## Files

| File | Description |
|------|-------------|
| `index.html` | App shell (markup only) |
| `css/base.css` | Shared styles — header, login, settings, metric cards |
| `css/property.css` | Property calculator styles |
| `css/stock.css` | Stock portfolio styles |
| `js/01-login.js` … `js/06-init.js` | App logic (load order matters) |
| `README.md` | This reference |
| `portfolio_data_<date>.json` | Export output (local only) |

Chart.js 4.4.1 via CDN. No npm install.
