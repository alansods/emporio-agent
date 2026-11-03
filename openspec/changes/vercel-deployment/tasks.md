# Tasks

## 1. Deploy configuration under test (commit: `feat(deploy): add vercel config for the api function`)

- [x] 1.1 Write `tests/test_vercel_config.py` from the CI scenarios of "API routes reach the Python function",
  "Function bundle carries runtime files" and "Function duration covers a full turn": rewrite `/api/:path*` to
  `/api/index`; `includeFiles` covers `emporio_agent/**`, `data/*.csv` and `data/politicas.txt`; `excludeFiles`
  covers `node_modules`, `.next`, tests, docs and `data/*.pdf`; `maxDuration > (MAX_TOOL_ROUNDS + 1) *
  MODEL_TIMEOUT_MS / 1000`; no `env` block holding `GEMINI_API_KEY` or `MODEL`. Verify `pytest` fails because
  `vercel.json` is missing.
- [x] 1.2 Add `vercel.json` (`$schema`, rewrite, `functions["api/index.py"]` with `includeFiles`, `excludeFiles`,
  `maxDuration: 120`, `regions: ["gru1"]`) per design D1 to D4. Verify `pytest`, `ruff check .`,
  `ruff format --check .`, `pnpm format:check` and `pnpm build` pass locally.
- [x] 1.3 Confirm `next.config.ts` still adds its `/api` rewrite only in development, so production routing comes
  only from `vercel.json`. Verify by reading the file and by `pnpm build` output listing no `/api` route.

## 2. Vercel project and environment (no commit, external setup)

- [x] 2.1 After group 1 is pushed and CI is green, create the Vercel project `emporio-agent` on the
  `alansods-projects` team by importing `github.com/alansods/emporio-agent` (preset Next.js, root `.`, production
  branch `main`). Verify the project shows the Git connection and a first production deployment starts.
- [ ] 2.2 The user adds `GEMINI_API_KEY` in Project Settings > Environment Variables, Sensitive, Production and
  Preview, then redeploys production. The value is never pasted in chat. Verify by listing env vars (names, targets
  and types only, no decryption).
- [ ] 2.3 Check the "No model override is pinned" scenario: the env var listing contains no `MODEL` and no
  `REFERENCE_DATE` for any target. Verify by the same listing.
- [x] 2.4 Check the build log of the production deployment: Python 3.12, `requirements.txt` installed, `api/index.py`
  built as one function in `gru1`, no build warnings about missing files. Verify by reading the deployment events.
  The first deploy installed from `pyproject.toml` and shipped without FastAPI; fixed by design D7 (a2d2720).

## 3. Production smoke test (fixes, if any, get their own `fix(api): ...` commit with a test)

- [x] 3.1 `curl -i https://<prod-url>/api/health` returns 200 and `{"status":"ok"}`, and
  `curl -i https://<prod-url>/api/does-not-exist` returns a JSON 404 with `error`. If the path reaches FastAPI as
  `/api/index`, apply the design risk fix (path-restoring middleware in `api/index.py` with a pytest), push, and
  re-check.
- [x] 3.2 Real chat turn: `curl -s -w '%{http_code} %{time_total}' -H 'content-type: application/json' -d
  '{"messages":[{"role":"user","text":"Quanto custa o violão Takamine GD20?"}],"locale":"pt-BR"}'
  https://<prod-url>/api/chat` returns 200 in under 15 s with R$ 2.199,00, PIX R$ 2.089,05 and 12x R$ 183,25 in
  `reply`. Record cold and warm timings. On a 503, check runtime logs and retry once before treating it as a defect.
  Result 2026-11-02 on `emporio-agent-three.vercel.app`: 200 in 2.3 s and 3.4 s, all three values quoted.
- [x] 3.3 Check "Key is not shipped to the browser": no `NEXT_PUBLIC_` variable exists, and fetching the home page
  plus its `/_next/static` chunks shows no `GEMINI` string or key value. Verify with `curl` and `grep`.

## 4. Documentation (commit: `docs: document vercel deployment and serverless limits`)

- [x] 4.1 README: add the production URL, a Deploy section (Git integration on `main`, `GEMINI_API_KEY` as a
  sensitive server env var, `MODEL` and `REFERENCE_DATE` optional and unset in production, `vercel.json` role), and a
  Known limitations entry: the per-IP rate limit is in memory per function instance, so the effective limit on
  serverless can exceed 10 req/min/IP; next step is a Vercel Firewall rate-limit rule or a shared store. Verify
  `pnpm format:check` passes and the README states each item of the "Serverless limitations are documented" scenario.
- [x] 4.2 `openspec/project.md` Non-functional constraints: note the per-instance rate limit and the chosen region;
  update the `CLAUDE.md` command table only if the deploy command changed. Verify `openspec validate
  vercel-deployment --strict` passes.

## Workflow follow-up

- Commit the proposal as `docs(openspec): propose vercel-deployment` after review.
- After all groups are done and CI is green, archive with `/opsx:archive` and commit
  `docs(openspec): archive vercel-deployment`.
