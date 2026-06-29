---
description: Sync README.md to the app — compact, table-first, scannable reference docs.
---

# /update-readme

Regenerate `README.md` so it matches the current Investment Dashboard. Output is **compact and table-heavy** — a reference sheet, not a tutorial.

## Prerequisites

Read the **update-readme** skill (`.cursor/skills/update-readme/SKILL.md`) before writing.

## Workflow

### 1. Scan the app

Read and grep `index.html`, `css/`, and `js/` for:

| Look for | Why |
|----------|-----|
| Slider labels, ranges, IDs | Financing / Returns inputs |
| Metric card labels | KPI tables |
| Modal fields | Add/edit stock, settings |
| `localStorage` / `Storage.save` keys | Persistence table |
| `calc*` functions | Maths table |
| New UI sections | Missing README sections |

### 2. Compare to README

| Change type | Action |
|-------------|--------|
| New feature | Add table row or subsection |
| Removed feature | Delete stale rows |
| Renamed label | Update table cell only |
| Unchanged | Keep concise wording |

### 3. Rewrite README

Use `.cursor/skills/update-readme/template.md` as the skeleton.

**Style checklist:**

| Rule | Target |
|------|--------|
| Line count | ≤ 180 lines (max 220) |
| Format | Tables over bullets and prose |
| Intro | One tagline line under title |
| Sections | `##` only; `---` between major areas |
| Secrets | Never document real API keys |

### 4. Verify

| Check | Pass criteria |
|-------|---------------|
| Accuracy | Every table row matches current UI |
| Scannability | No paragraph > 2 sentences |
| Completeness | All 9 required sections from skill present |
| Brevity | No duplicate facts across sections |

## Output

- Edit **only** `README.md` unless the user also asked for app changes.
- Reply with a short summary: sections updated, lines added/removed, anything flagged as uncertain.

## Examples

**User:** `/update-readme`

**Agent:** Scans HTML → rewrites README from template → reports "Added CLP possession field; trimmed Financing prose to tables; 198 → 162 lines."

**User:** "I added a dividend column to stocks — update the readme"

**Agent:** Grep stock table in HTML → add column row → sync README → done.
