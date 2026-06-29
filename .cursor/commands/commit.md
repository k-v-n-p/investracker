---
description: Pre-commit review, short conventional commit message, commit, and push to remote. Use when the user runs /commit, asks to commit and push, or wants a pre-commit review before shipping changes.
---

# /commit

Review all pending changes, commit with a short conventional message, and push to remote.

## Git safety (mandatory)

| Rule | Action |
|------|--------|
| Never update git config | Do not run `git config` |
| Never force push | No `--force` unless user explicitly requests |
| Never skip hooks | No `--no-verify` unless user explicitly requests |
| Never amend | Unless user explicitly requests AND HEAD was your commit AND not pushed |
| Secrets | Do not commit `.env`, credentials, or files with API keys |
| Push scope | Push current branch only — warn before pushing to `main`/`master` |

## Step 1 — Gather state (run in parallel)

```bash
git status
git diff
git diff --staged
git log -5 --oneline
git branch -vv
git remote -v
```

## Step 2 — Pre-commit review

Present a compact review table before committing:

| Check | Result |
|-------|--------|
| Files changed | List with add/modify/delete |
| Scope | One sentence: what this commit does |
| Risks | Secrets, unrelated files, debug code, large binaries |
| Branch | Current branch + tracking status |
| Remote | `origin` URL if configured |

**Block and ask** if any of these apply:

| Blocker | Action |
|---------|--------|
| API keys / tokens in diff | Exclude file; warn user |
| `portfolio_data_*.json` with keys | Exclude unless user confirms |
| No changes | Stop — nothing to commit |
| Unrelated mixed changes | Ask: one commit or split? |
| Push to `main`/`master` | Warn and confirm before push |
| No remote configured | Commit locally; report push skipped |

## Step 3 — Stage files

Stage only files that belong in this commit. Exclude:

- `.env`, `*.pem`, `credentials.json`
- `portfolio_data_*.json` (unless user confirms — often contains API keys)
- `.cursor/` cache or local-only artifacts the user did not intend to share

```bash
git add <relevant-files>
```

## Step 4 — Commit message

Use **Conventional Commits**. Keep the subject line **≤ 50 characters**.

### Format

```
<type>(<scope>): <subject>

<body — one sentence max, only if needed>
```

### Types

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | README or docs only |
| `refactor` | Code change, no behavior change |
| `chore` | Tooling, config, hooks, skills |
| `style` | Formatting only |

### Scopes (this project)

| Scope | Area |
|-------|------|
| `property` | Property calculator, CLP, loan logic |
| `stocks` | Stock portfolio, Alpha Vantage |
| `ui` | Shared layout, styling |
| `docs` | README |
| `cursor` | `.cursor/` commands, hooks, skills |

### Examples

```
feat(stocks): add weight column to holdings
fix(property): correct CLP break-even at possession
docs: sync README to compact table format
chore(cursor): add pre-commit and update-readme commands
```

Draft the message from the actual diff — do not use generic placeholders.

## Step 5 — Commit

Use a HEREDOC for the message (PowerShell-friendly alternative on Windows):

```bash
git commit -m "feat(stocks): add weight column to holdings"
```

If a body is needed (rare):

```bash
git commit -m "feat(stocks): add weight column" -m "Compute weight from market value share of portfolio."
```

On commit hook failure: **fix the issue and create a NEW commit** — never amend a failed commit.

Verify:

```bash
git status
```

## Step 6 — Push

```bash
git push -u origin HEAD
```

| Situation | Action |
|-----------|--------|
| Branch not tracking remote | Use `-u origin HEAD` |
| Already tracking | `git push` |
| Push rejected (non-fast-forward) | Report error; do not force push — ask user |
| No remote | Skip push; tell user to add remote |

## Output to user

Reply with a short summary:

| Field | Content |
|-------|---------|
| Review | 1–2 lines on what was committed |
| Message | The exact commit subject used |
| Push | Branch pushed to remote, or reason skipped |
| Warnings | Any excluded files or blockers |

## Examples

**User:** `/commit`

**Agent:** Reviews diff → stages app + README → `feat(stocks): add dividend column` → push → "Committed and pushed to origin/feature-x."

**User:** `/commit but don't push`

**Agent:** Review + commit only; skip Step 6.

**User:** `/commit` *(with API key in portfolio export)*

**Agent:** Flags secret → excludes file → commits rest → warns user.
