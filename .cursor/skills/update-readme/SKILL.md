---
name: update-readme
description: Regenerates README.md as compact, table-first documentation synced to the Investment Dashboard app. Use when running /update-readme, after app feature changes, or when the user asks to update, refresh, or sync the README.
---

# Update README

## Goal

Rewrite `README.md` so it matches the **current** app behavior. Output must be **compact, scannable, and table-heavy** — not a prose manual.

## Source of truth (read before writing)

1. `index.html`, `css/`, and `js/` — UI labels, inputs, logic, localStorage keys
2. Existing `README.md` — keep accurate sections; drop stale or redundant text
3. `.cursor/skills/stock-portfolio-tracking/` and `.cursor/skills/property-investment-tracking/` — formulas and schemas

Do not invent features. If unsure, grep `index.html` and `js/`.

## Style rules

| Rule | Requirement |
|------|-------------|
| Length | Target **≤ 180 lines**; hard max 220 |
| Structure | Tables first; prose only for 1–2 sentence intros |
| Sections | Use `##` headings; separate major areas with `---` only |
| Bullets | Avoid — convert lists to tables |
| Duplication | Never repeat the same fact in two sections |
| Voice | Neutral, present tense, user-facing (not dev diary) |
| Code | Inline backticks for keys, IDs, filenames — no long code blocks |

## Required sections (in order)

Use [template.md](template.md) as the skeleton. Every section below must exist; omit subsections that no longer apply.

| # | Section | Table focus |
|---|---------|-------------|
| 1 | Title + one-line tagline | — |
| 2 | Quick start | Step \| Action (3–4 rows max) |
| 3 | Dashboards | Dashboard \| Access \| Purpose |
| 4 | Property calculator | Profiles, payment modes, tab inputs, metrics, charts |
| 5 | CLP tranche schedule | Fields + actions (only if CLP still exists) |
| 6 | Stock portfolio | Summary cards, charts, holdings columns, add/edit fields |
| 7 | Shared features | Currency, settings, persistence |
| 8 | Maths / formulas | Concept \| Formula or logic |
| 9 | Files | File \| Description |

## Table patterns

**Inputs:** `| Input | Range | Description |`

**Metrics / cards:** `| Metric | Description |`

**Charts:** `| Element or line | Meaning |`

**Actions:** `| Action | How |`

**Storage:** `| Key | Contents |`

Keep cell text short. Split wide tables rather than wrapping paragraphs inside cells.

## Workflow

```
Task Progress:
- [ ] Grep/read HTML for new/changed UI (sliders, cards, modals, keys)
- [ ] Diff mentally against current README — note adds/removes/renames
- [ ] Rewrite README using template + style rules
- [ ] Verify line count ≤ 220 and every table has a header row
- [ ] Confirm no secrets (API keys) in README
```

## Do not

- Add install/build steps (app is single-file, no npm)
- Document `.cursor/` internals unless user asked
- Expand into tutorials — this is a reference sheet
- Change app code unless user also requested a feature

## Hook integration

When `additional_context` from the sync hook appears in chat, treat it as a **mandatory README sync** before marking the task complete — unless the user explicitly said to skip docs.
