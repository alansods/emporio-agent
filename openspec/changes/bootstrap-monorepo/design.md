# Design

## Context

Empty repo with OpenSpec initialized. Local machine has Node 23, pnpm 10, `uv`, and system Python 3.9 (too old), so
Python 3.12 comes from `uv`. Target platform is Vercel: one project, Next.js preset at the repo root, a Python
function at `api/index.py`. See proposal.md for scope.

## Goals / Non-Goals

**Goals:**

- One command per task (install, dev, lint, test, type-check) for web and api, identical locally and in CI.
- A layout Vercel builds with zero framework config.
- Spec scenarios covered by automated tests from day one.

**Non-Goals:**

- `vercel.json`, function limits and `includeFiles` (verified against current Vercel docs in `vercel-deployment`).
- Any runtime dependency not needed by this change.

## Decisions

**Next.js at the root, FastAPI in `api/`.** Vercel detects Next.js at the root and treats `api/*.py` as Python
functions. Alternative: two Vercel projects or a `web/` + `api/` monorepo with root-directory settings. Rejected:
more config, two deploys, CORS between origins.

**Local API proxy through `next.config` rewrites, dev only.** `pnpm dev` + `uvicorn` on port 8000, with `/api/:path*`
rewritten to `http://127.0.0.1:8000/api/:path*` when `NODE_ENV === "development"`. The browser always calls
same-origin `/api/...`, so no CORS and no environment-specific URLs in client code. `vercel dev` stays an option.

**FastAPI routes keep the `/api` prefix.** The function is reached at `/api/...` both on Vercel (via a rewrite added
later) and locally through the proxy, so routes are declared as `/api/health` and tests hit the same paths.

**Python packaging: `requirements.txt` + `requirements-dev.txt` + `uv`.** Vercel installs `requirements.txt`; dev
tools stay out of the function bundle. `uv` gives a fast, pinned Python 3.12 without pyenv. `pyproject.toml` holds
only ruff and pytest config (no build backend). Alternative: Poetry. Rejected: heavier, and Vercel reads
`requirements.txt` directly.

**404 as JSON.** A FastAPI exception handler returns `{"error": "..."}` for HTTP errors, so the client and later
error handling share one shape. The full error contract is defined in `chat-api` later.

**Design tokens as CSS variables in `styles/tokens.css`.** The palette from `openspec/project.md` goes in `:root`
with `color-scheme: dark`. Contrast is checked for text pairs (`--text` and `--text-muted` on `--bg`, `--surface`,
`--surface-2`, white on `--pink`); values are adjusted only if a pair fails WCAG AA, and the check is recorded in a
unit test that computes contrast ratios from the token file.

**Reduced motion in `globals.css`.** One `@media (prefers-reduced-motion: reduce)` block sets animation and transition
durations to `0.01ms`. It is verified by a test that asserts the rule is present (jsdom does not evaluate media
queries); the 360 px check is a manual verification now and moves to the Playwright smoke test later.

**Fonts via `next/font/google`.** Sora (headings, prices) and Inter (body) are self-hosted at build time, no runtime
request to Google, exposed as CSS variables.

**Tooling versions.** Node 22 LTS in CI and `.nvmrc` (local Node 23 is compatible), pnpm pinned via `packageManager`,
Python 3.12. Dependency versions are pinned to the current stable releases at install time.

**CI: one workflow, two jobs.** `web` (pnpm install, lint, type-check, test) and `api` (uv, ruff check, ruff format
--check, pytest). Runs on push and pull request. No secrets.

## Risks / Trade-offs

- [The Python function path and rewrite behave differently on Vercel than locally] → Health endpoint is the first
  thing verified on the preview deploy in `vercel-deployment`; routes keep the `/api` prefix to match both.
- [Next.js minor upgrades change lint config defaults] → Versions pinned in the lockfile; CI uses `--frozen-lockfile`.
- [CSS behavior (no horizontal scroll, reduced motion) is hard to test in jsdom] → Test what jsdom can see (the rule
  exists, landmarks exist), verify layout manually now, and cover it with Playwright later.
