# Proposal

## Why

The API has only run under local `uvicorn`. Serverless runtime problems (routing of `/api/*` to the Python function,
data files missing from the bundle, import paths, env vars, cold starts, function duration) only show up on Vercel,
and they are cheaper to find now than after the UI work lands. The brief also expects a public, working URL.

## What Changes

- Add `vercel.json` with a rewrite of `/api/:path*` to the single FastAPI function `api/index.py`, and a `functions`
  entry for `api/index.py` that bundles `emporio_agent/**` and the runtime data files, excludes tests, docs and the
  policy PDF, and sets `maxDuration` above the worst-case agent turn.
- Add a pytest contract test that reads `vercel.json` and checks those settings, so a later edit cannot silently
  break routing or the bundle.
- Create the Vercel project `emporio-agent` linked to `github.com/alansods/emporio-agent`, production branch
  `main`, deploys through the Git integration.
- Set `GEMINI_API_KEY` as a server-side, sensitive environment variable (Production and Preview). Leave `MODEL` and
  `REFERENCE_DATE` unset so the code defaults apply (`gemini-3.5-flash-lite`, `2026-03-23`). There is no Vercel
  project yet, so no `MODEL=gemini-3.8-flash` is pinned anywhere; the task list re-checks this after setup.
- Smoke-test production: `GET /api/health` returns 200 and one real `POST /api/chat` (Takamine GD20 price, pt-BR)
  returns 200 within the 15 s model timeout and quotes R$ 2.199,00, PIX R$ 2.089,05 and 12x R$ 183,25.
- Document the production URL, the Vercel env vars and the known limitation that the in-memory rate limit is per
  function instance on serverless (README and `openspec/project.md`).

Out of scope:

- Fixing the per-instance rate limit (shared store such as Redis or the Vercel Firewall rate-limit rules). Recorded
  as a known limitation and a next step.
- Custom domain, multiple regions, preview-deploy protection settings, observability drains, CI-driven deploys
  (`vercel --prod` from GitHub Actions). The Git integration already deploys on push.
- Any UI work. The production page is still the bootstrap placeholder.
- A `trace` field in the chat response, so tool calls are checked through the reply values, not the payload.

No new dependency. `vercel.json` is configuration only; the Vercel CLI is optional and only used for local
`vercel dev` and log inspection.

## Capabilities

### New Capabilities

- `deployment`: how the app is served in production: `/api/*` reaches the FastAPI function, the function bundle
  carries the code and data it reads at runtime, the function may run longer than one worst-case agent turn, secrets
  stay server side, configuration defaults apply when env vars are unset, and the known serverless limitations are
  documented.

### Modified Capabilities

None. The `chat-api` requirements (health, limits, rate limit, timeout, errors) are unchanged; this change only
serves them from Vercel.

## Impact

- New: `vercel.json`, `tests/test_vercel_config.py`.
- Docs: `README.md` (live URL, deploy and env var section, known limitations), `openspec/project.md` (Non-functional
  constraints: per-instance rate limit), `CLAUDE.md` command table if the deploy command changes.
- External: a new Vercel project on the `alansods-projects` team with Git integration and one encrypted env var.
- Code under `emporio_agent/` and `api/index.py` is not expected to change. If the deploy exposes a runtime defect
  (for example the request path seen by FastAPI after the rewrite), the fix lands in this change with a test.
