---
name: stock-portfolio-tracking
description: Expert guidance for building and extending US stock portfolio tracking — holdings, cost basis, live prices, performance charts, and allocation. Use when coding stock portfolio features, Alpha Vantage integration, holdings CRUD, merge logic, Chart.js stock charts, or when the user mentions stocks, equities, tickers, portfolio value, or US investments.
---

# Stock Portfolio Tracking

## Project context

This repo is a **static browser app** (`index.html` + `css/` + `js/`). No build step. Stock logic lives in `js/06-stock.js` — Alpha Vantage API, holdings, charts, and modal.

Toggle dashboards by clicking the header title. Stock data persists in `localStorage` — never add a server unless explicitly requested.

Read [README.md](../../README.md) for user-facing behavior before changing features.

## Data model

### Holding (stored in `stock_holdings`)

```javascript
{ ticker, name, shares, avgCost, firstBuyDate }
```

| Field | Rules |
|-------|-------|
| `ticker` | Uppercase symbol; unique key for merge |
| `shares` | Fractional allowed |
| `avgCost` | Weighted average purchase price in USD |
| `firstBuyDate` | ISO date string `YYYY-MM-DD` |

### Export/import envelope

```javascript
{ version, exportedAt, settings: { apiKey, apiKey2 }, property_profiles, stock_holdings }
```

### Runtime price cache

Alpha Vantage responses cached under `localStorage` keys prefixed `av_`. Settings in `app_settings` (API keys, exchange rate).

## Core formulas (must stay consistent)

```javascript
// Weighted average on duplicate ticker add (not edit)
newAvg = (oldShares × oldAvg + newShares × newPrice) / (oldShares + newShares)

costBasis      = Σ(shares × avgCost)
portfolioValue = Σ(shares × currentPrice)   // fallback to avgCost if price missing
totalReturn    = portfolioValue − costBasis
returnPct      = totalReturn / costBasis × 100
todaysGain     = Σ(shares × dayChange)
positionReturn = mktValue − costBasis
```

Performance series: for each trading date, sum `shares × close`; **fill forward** last known close when a ticker has no bar on that date.

## Alpha Vantage integration

| Concern | Pattern |
|---------|---------|
| Free tier | 25 requests/day per key |
| Dual keys | Key 2 is fallback when Key 1 exhausted |
| Endpoints | `GLOBAL_QUOTE` (live price), `SYMBOL_SEARCH` (autocomplete), `TIME_SERIES_DAILY` (100-day history) |
| Cache | Store responses in `av_*` keys; respect TTL to avoid re-fetching |
| UX | Show skeleton loaders in table until prices arrive; status bar shows last refresh time |

When adding API calls, always check existing fetch/cache helpers before writing new ones. Preserve graceful degradation when keys are missing or rate-limited.

## UI components to preserve

| Component | ID / selector | Purpose |
|-----------|---------------|---------|
| Summary cards | `sh-total-val`, `sh-invested`, `sh-ret-*`, `sh-today`, `sh-count` | Portfolio KPIs |
| Holdings table | `sh-tbody` | Per-position P&L |
| Performance chart | `sh-perf-canvas` | 100-day line chart |
| Allocation chart | `sh-alloc-canvas` | Doughnut by market value |
| Add/edit modal | `sh-modal-overlay` | `_editIdx >= 0` means edit mode |
| Refresh | `.sh-refresh` | Re-fetch quotes |

Formatting: use existing `fmtUSD()` for dollar display; green `#10b981` / red `#f87171` for gain/loss.

## Implementation checklist

When adding or changing stock features:

```
Task Progress:
- [ ] Read surrounding stock section in the HTML file first
- [ ] Match existing naming (camelCase, `sh-` prefix for stock DOM ids)
- [ ] Update `mergeHolding` / `calcPortfolio` / `buildPerfSeries` if metrics change
- [ ] Persist via `Storage.save('stock_holdings', stockHoldings)`
- [ ] Include holdings in export/import if schema changes
- [ ] Re-render via `renderStockDash()` (or the specific sub-render it calls)
- [ ] Handle empty portfolio and missing-price states
- [ ] Test with and without API key configured
```

## Common tasks

### Add a new column to holdings table

1. Extend `renderHoldings()` row template.
2. Compute value from `stockPrices[h.ticker]` and holding fields.
3. Keep numeric columns right-aligned (existing `nth-child` CSS).

### Add a new portfolio metric

1. Extend `calcPortfolio()` return object.
2. Wire into `updateStockCards()`.
3. Add a metric card in the stock dashboard HTML if needed.

### Change merge behavior

- **Add to existing ticker**: weighted average (default).
- **Edit mode** (`_editIdx >= 0`): replace row, do not merge.
- Never create duplicate tickers in the array.

## Coding conventions

- Vanilla JS only — no frameworks, no npm in this repo.
- Chart.js 4.4.1 from CDN; follow existing chart config (dark theme, no legend on perf chart).
- `ALLOC_COLORS` array for doughnut segments; cycle if more holdings than colors.
- Keep all stock CSS under `/* ── Stock dashboard ── */` section.
- Minimize diff scope: one feature per change, match indentation and comment banners (`// ══ SECTION ══`).

## Anti-patterns

- Do not store API keys in committed JSON exports — warn user if export schema exposes secrets.
- Do not break import of older `version: 1` exports.
- Do not fetch prices on every keystroke; batch refresh on load and manual refresh.
- Do not use backend/database patterns — this app is offline-first.

## Additional resources

- Domain formulas and column definitions: [reference.md](reference.md)
