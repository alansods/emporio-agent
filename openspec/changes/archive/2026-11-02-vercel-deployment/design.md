# Design

## Context

- One repo, one planned Vercel project: Next.js 16 (App Router) at the root, FastAPI exported as `app` from
  `api/index.py`, the only Python file under `api/`. Shared code lives in root `emporio_agent/`, outside `api/`, so
  Vercel does not turn each module into a function.
- `emporio_agent/config.py` resolves `DATA_DIR` as `<repo>/data` and reads `politicas.txt` and the CSVs by path at
  runtime. Imports are traced by the bundler; data files read by path are not guaranteed to be.
- `next.config.ts` rewrites `/api/*` to `127.0.0.1:8000` only when `NODE_ENV === "development"`. In production it
  returns no rewrites, so nothing on the Next.js side handles `/api/*` today.
- One agent turn makes at most `MAX_TOOL_ROUNDS + 1 = 6` model calls, each with a 15 s timeout: worst case 90 s.
- Vercel docs (fetched 2026-11-02): a file in `api/` that defines `app` becomes an ASGI function served at its file
  path (`api/index.py` at `/api`); `functions` in `vercel.json` is keyed by that file path and accepts
  `maxDuration`, `includeFiles` and `excludeFiles`; Python defaults to 3.12 and reads `.python-version` (already
  `3.12`) and root `requirements.txt`; Fluid compute is the default for new projects.
- The `alansods-projects` team has no project yet, so no environment variable (and no `MODEL` pin) exists.

## Goals / Non-Goals

**Goals:**

- Every `/api/*` request on the production URL reaches FastAPI with its original path.
- The deploy configuration is small, declarative and covered by a pytest contract test.
- The Gemini key is entered by the user in the Vercel dashboard and never passes through the repo, the chat or CI.

**Non-Goals:**

- No change to request handling, limits or error mapping (owned by `chat-api`).
- No Vercel SDK, no `vercel.ts`, no Vercel Services layout.

## Decisions

### D1. File-based function plus one rewrite in `vercel.json`

`vercel.json` rewrites `{"source": "/api/:path*", "destination": "/api/index"}`. Vercel checks the filesystem
(static files, the function at `/api/index`) before rewrites, so `/api/health` and `/api/chat` fall through to the
rewrite and land on the one FastAPI function, which keeps routing them itself.

Alternatives:

- FastAPI framework preset (zero-config `index.py` at root, Python as the project framework): conflicts with Next.js
  as the project framework in a single project.
- Vercel Services (`services` + per-service rewrites): designed for separate roots (`frontend/`, `backend/`); this
  repo shares one root and one `package.json`, so it adds structure for no gain.
- One file per endpoint (`api/health.py`, `api/chat.py`): duplicates the app, the error handlers and cold starts.

### D2. Explicit bundle: include code and data, exclude the rest

`functions["api/index.py"]` sets:

- `includeFiles`: `{emporio_agent/**,data/*.csv,data/politicas.txt}`, so path-read data is always present.
- `excludeFiles`: `{node_modules/**,.next/**,tests/**,__tests__/**,docs/**,openspec/**,examples/**,data/*.pdf}`,
  which keeps the bundle small (the policy PDF alone is 180 KB and only feeds `scripts/extract_policies.py`).

Alternative: rely on default tracing. Rejected because missing-file errors would only appear at runtime, which is
exactly what this change is meant to catch early, and a contract test can pin the explicit lists.

### D3. `maxDuration: 120`

Above the 90 s worst-case turn (see Context) with headroom for a cold start, so a slow turn ends with the API's own
`{"error": "model_unavailable"}` 503 rather than a Vercel `FUNCTION_INVOCATION_TIMEOUT` HTML page. It is within the
Hobby limit with Fluid compute. The contract test asserts `maxDuration > (MAX_TOOL_ROUNDS + 1) * MODEL_TIMEOUT_MS /
1000`, importing both constants, so a change in either side keeps them consistent.

### D4. Region `gru1` (São Paulo)

The store and its customers are in Brazil. Hobby allows one region of choice. Function-to-Gemini latency goes to
Google's global front end either way, so the user-to-function hop is what the region changes.
Alternative: default `iad1`; acceptable, but adds roughly 120 ms per round trip for Brazilian users.

### D5. Project and env vars are set up through the dashboard (or the Vercel MCP) by the user

The Vercel project is created by importing the GitHub repo (framework preset Next.js, root directory `.`, production
branch `main`). The user pastes `GEMINI_API_KEY` in Project Settings > Environment Variables, marked Sensitive, for
Production and Preview. `MODEL` and `REFERENCE_DATE` are not created. Values are never requested in chat or decrypted
when listing; the check only lists names, targets and types.

### D6. Contract test reads `vercel.json`

`tests/test_vercel_config.py` loads `vercel.json` with `json` (no new dependency) and checks the rewrite, the
`includeFiles` and `excludeFiles` globs, `maxDuration` against the constants, and that no `env` block in `vercel.json`
holds a secret or a `MODEL` value. Platform behavior (path forwarding, bundle contents, env targets) is verified by
the manual production smoke, matching the "Deploy smoke: manual" row of the project test strategy.

### D7. No `pyproject.toml`: runtime dependencies come only from `requirements.txt`

Found on the first deploy: when `pyproject.toml` exists, Vercel installs dependencies from it and ignores
`requirements.txt`. Ours held only ruff and pytest settings, so the function shipped without FastAPI
(`ModuleNotFoundError: No module named 'fastapi'`). The tool settings move to `ruff.toml` and `pytest.ini`, and the
contract test fails if `pyproject.toml` comes back.
Alternative: declare `[project].dependencies` in `pyproject.toml`. Rejected because it duplicates
`requirements.txt`, which CI, the local setup and the docs already use, and two lists drift.

## Risks / Trade-offs

- [The rewrite forwards `/api/index` instead of the original path to ASGI, so every route 404s] → `GET /api/health`
  and `GET /api/does-not-exist` are checked right after the first deployment; nothing depends on the URL yet, so a
  broken first production deploy costs nothing. If the path is rewritten, the fix is a small
  ASGI middleware in `api/index.py` restoring the path from the request URL, added with a test in this change.
- [In-memory rate limit is per function instance; Fluid compute reuses instances but scale-out and cold starts reset
  or split the counters] → Accepted and documented. Next step: Vercel Firewall rate-limit rule or a shared store.
- [Cold start adds latency to the first chat request] → The 15 s acceptance bound is for the model call; the smoke
  test records cold and warm timings. Stdlib `csv` (no pandas) already keeps imports light.
- [Free-tier Gemini quota or regional overload causes 503 in production] → Already mapped to
  `{"error": "model_unavailable"}`; the smoke test is repeated once before concluding it is a deploy defect.
- [Public URL invites abuse of the key] → Existing limits (20 messages, 2000 chars, 10 req/min/IP per instance,
  tool round cap) plus a free-tier or budget-alerted key, as stated in `project.md` Non-functional constraints.

## Migration Plan

1. Merge `vercel.json` and the contract test to `main` (CI green).
2. Create the project via Git import; add `GEMINI_API_KEY`; the import triggers the first production deployment.
3. Smoke test production. If routing fails, fix per the first risk and push; Vercel redeploys on push.
4. Rollback: Vercel Instant Rollback to the previous deployment, or revert the commit. Nothing else depends on the
   deployment yet.
