# Property Investment Reference

## Input ranges (sliders)

| Input | Range | Step |
|-------|-------|------|
| Property value | ₹25 L – ₹5 Cr | varies |
| Interest rate | 7% – 12% | 0.25% |
| Total monthly payment | EMI floor – ₹10 L | ₹5,000 |
| Appreciation rate | 0% – 20% p.a. | varies |

## Returns chart elements

| Element | Color / style | Meaning |
|---------|---------------|---------|
| Green line | `#10b981` | Property value (appreciating) |
| Orange line | `#f97316` | Cost basis (cash out + loan balance) |
| Yellow dot | marker | Break-even (property value = cost basis) |
| Dashed vertical | white 13% | Loan end month |
| Milestone labels | 3/5/10 yr | Net equity at horizon |

## Loan balance chart

| Line | Color | Meaning |
|------|-------|---------|
| Blue solid | `#3b82f6` | With prepayment schedule |
| Red dashed | `#ef4444` | Baseline 20-year no prepay |

## CLP tranche schedule

| Field | Rule |
|-------|------|
| `label` | Milestone name (Booking, Slab, Possession, etc.) |
| `pct` | Share of total cash; all rows sum to 100% |
| `month` | Months from today when payment due |
| Last row | Month locked to possession date |

Presets: **Equal Split** — N equal payments evenly spaced to possession.

## localStorage keys

| Key | Contents |
|-----|----------|
| `property_profiles` | Array of profile objects |
| `app_settings` | API keys + exchange rate |

## Opportunity cost section

`calcInvestAlt` compares property net equity path against an alternate annual return (`altPct`). Supports lump-sum vs SIP-style monthly investing depending on whether rent exceeds EMI. Do not show SIP path when rent > EMI (see `opp-sip-warn`).

## Export schema (property portion)

```javascript
property_profiles: [{
  name: "Property 1",
  color: "#a78bfa",
  state: { prop, cash, loan, rate, totalPay, appPct, rentalINR, horizonYrs, activeTab, ... }
}]
```
