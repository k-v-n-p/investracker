# Stock Portfolio Reference

## Alpha Vantage endpoints used

| Purpose | Function | Notes |
|---------|----------|-------|
| Live quote | GLOBAL_QUOTE | `price`, `change`, `changePercent` |
| Symbol search | SYMBOL_SEARCH | Autocomplete in add-stock modal |
| Daily history | TIME_SERIES_DAILY | Last ~100 trading days for perf chart |

## localStorage keys

| Key | Contents |
|-----|----------|
| `stock_holdings` | Array of holding objects |
| `app_settings` | `{ apiKeys: string[], exchangeRate }` |
| `av_*` | Cached API responses per symbol/endpoint |

## Chart behavior

**Performance chart**: single dataset, blue line `#3b82f6`, filled area, x-axis shows `MM-DD`, y-axis uses `fmtUSD`.

**Allocation chart**: doughnut, `cutout: '62%'`, tooltip shows label + USD value. Legend rendered manually below chart as colored dots.

## Holdings table columns

| Column | Source |
|--------|--------|
| Ticker | `h.ticker` |
| Company | `h.name` |
| Shares | `h.shares` |
| Avg Cost | `h.avgCost` |
| Current | `stockPrices[h.ticker].price` |
| Mkt Value | `shares × current` |
| Return $ | `mktValue − shares × avgCost` |
| Return % | `return$ / costBasis × 100` |
