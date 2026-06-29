---
name: property-investment-tracking
description: Expert guidance for Hyderabad real estate investment modeling — home loans, EMI, prepayment, CLP tranches, appreciation, rental income, and break-even analysis. Use when coding property calculator features, loan amortization, OTP/CLP payment modes, property profiles, INR/USD conversion, or when the user mentions real estate, home loans, EMI, down payment, or property returns.
---

# Property Investment Tracking

## Project context

This repo is a **static browser app** (`index.html` + `css/` + `js/`). No build step. Property logic lives in `js/05-property.js` — maths, CLP, profiles, and tabs.

Default dashboard on load is the property calculator. Up to **10 property profiles**, each with independent state. Data persists in `localStorage` under `property_profiles`.

Read [README.md](../../README.md) for user-facing behavior before changing features.

## Payment modes

| Mode | Label in UI | When |
|------|-------------|------|
| **OTP** | Ready to Move | Full cash + loan at purchase; appreciation from month 0 |
| **CLP** | Under Construction | Cash in tranches; loan starts at possession; property value = 0 until possession |

Always branch on `payMode` (or `clpPayMode` in UI state). OTP uses `calcReturns`; CLP uses `calcReturnsCLP`.

## Profile state schema

Each profile in `property_profiles`:

```javascript
{
  name, color,
  state: {
    prop, cash, loan, rate, totalPay,   // totalPay = intended monthly outflow
    appPct, rentalINR, horizonYrs, activeTab,
    payMode,                            // 'OTP' | 'CLP'
    possessionMonth,                    // months from today (CLP)
    clpTranches                         // [{ label, pct, month }] — CLP only
  }
}
```

Constraint: `cash + loan = prop` (sliders auto-sync).

## Core formulas (must stay consistent)

```javascript
TERM = 240  // 20-year standard term

monthlyRate = annualRate / 12 / 100
EMI = P × mr × (1+mr)^n / ((1+mr)^n − 1)

// Each month during loan:
interest  = balance × monthlyRate
principal = min(EMI − interest + extraPrepay, balance)
extraPrepay = totalMonthlyPayment − EMI   // when totalPay > EMI

// Returns tab (OTP):
monthlyAppreciation = (1 + appPct/100)^(1/12) − 1
propertyValue[m]    = prop × (1 + monthlyAppreciation)^m
cumulativeOutflow   = cash + Σ(interest + principal − rental)
netEquity[m]        = propertyValue[m] − cumulativeOutflow − loanBalance[m]

breakEvenMonth  = first m where netEquity > 0
recoupMonth     = first m where netEquity ≥ initial cash (down payment)
```

### CLP-specific rules

- Cash tranches pay out per schedule; percentages must sum to **100%**.
- Last tranche month locked to possession date.
- Property value stays **0** until possession month, then jumps to full `prop` and appreciates from there.
- Loan amortization begins at possession; `loanEndM` offset by possession month.
- Pre-possession bar shows tranche outflows (no pre-EMI interest in current model).

## UI structure

| Tab | Purpose | Key outputs |
|-----|---------|-------------|
| **Financing** | Loan + prepayment | Base EMI, payoff time, interest saved, loan balance chart |
| **Returns** | Appreciation + rental | Net equity milestones, break-even chart, horizon cards (3/5/10 yr) |

| Control | Notes |
|---------|-------|
| Profile pills | Switch/rename/duplicate/delete profiles |
| INR / USD toggle | Property values only; uses custom ₹/$ rate from settings |
| Horizon pills | `horizonYrs`: 3, 5, or 10 |
| Opportunity cost | Compares property vs alternate investment (`calcInvestAlt`) |

Charts use Chart.js with custom `msPlugin` for milestone markers (break-even dot, loan-end line, horizon labels).

## Key functions (edit these, don't duplicate)

| Function | Role |
|----------|------|
| `calcEMI(p, r)` | Base EMI over 240 months |
| `amortize(loan, rate, extra)` | Loan schedule with prepayment |
| `amortizeBase(loan, rate)` | Baseline 20-yr no-prepay comparison |
| `calcReturns(...)` | OTP returns series + break-even |
| `calcReturnsCLP(...)` | CLP returns with tranche + possession |
| `calcInvestAlt(...)` | Opportunity-cost alternate return |
| `update()` | Main recalc entry — reads sliders, persists, re-renders |
| `persistProfiles()` | Saves to `property_profiles` |

## Implementation checklist

When adding or changing property features:

```
Task Progress:
- [ ] Determine OTP vs CLP impact before coding
- [ ] Read `update()` and the relevant calc function
- [ ] Keep cash + loan = property value invariant
- [ ] Update both Financing and Returns tabs if inputs are shared
- [ ] Persist profile state on change via `persistProfiles()`
- [ ] Include new fields in export/import and profile duplicate logic
- [ ] Refresh charts (loan balance + property value vs cost basis)
- [ ] Verify INR/USD conversion if adding displayed amounts
- [ ] Test edge cases: zero loan, zero rental, 100% cash, max prepay
```

## Common tasks

### Add a new slider input

1. Add HTML in the left panel under the correct tab.
2. Wire `oninput="update()"` (or load/save in profile `state`).
3. Read value in `update()` / `saveCurrentProfileState()`.
4. Pass into `calcReturns` or `calcReturnsCLP` if it affects projections.

### Add a new metric card

1. Compute in `update()` from existing amortization/returns output.
2. Set element text with existing `fmt()` / `fmtAxis()` helpers.
3. Match card CSS classes (`mc blue`, `mc green`, etc.).

### Add CLP tranche field

- Tranche rows: label, percentage, month.
- Validate pct sum = 100 before chart update.
- Final row month = possession date (non-editable).

## Coding conventions

- Amounts stored in **INR** internally; USD is display-only via exchange rate.
- Vanilla JS, single HTML file, Chart.js 4.4.1 CDN.
- Comment sections use `// ══ NAME ══` banners — follow this pattern.
- Property CSS lives above the stock section; use existing slider/metric/card classes.
- `fmt()`, `fmtAxis()`, `fmtYrMo()` for display — reuse, don't reinvent.

## Anti-patterns

- Do not mix CLP and OTP logic in one function — keep `calcReturns` / `calcReturnsCLP` separate.
- Do not change `TERM` (240) without updating README and baseline comparison charts.
- Do not add tax, stamp duty, or maintenance unless user explicitly requests — keep scope minimal.
- Do not break backward compatibility of exported JSON (`version: 1`).

## Additional resources

- Full input ranges, chart elements, and CLP tranche rules: [reference.md](reference.md)
