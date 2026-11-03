# Empório da Música support agent

Customer support chat agent for Empório da Música, a fictional musical instrument store in Campo Grande, MS. A Python
agent (FastAPI, Gemini function calling) answers from the store's data and policy manual; a Next.js web app renders
the chat.

Live: https://emporio-agent-three.vercel.app (the chat API is at `/api/chat`; the chat UI is still in progress).

> Work in progress. The full README (decisions, assumptions, limitations, example conversations) comes with the final
> change.

## Getting started

### Prerequisites

- Node.js 22 and pnpm 10 (`corepack enable` installs the pinned pnpm)
- Python 3.12 and [uv](https://docs.astral.sh/uv/)

### Install

```bash
pnpm install
uv venv --python 3.12
uv pip install -r requirements.txt -r requirements-dev.txt
source .venv/bin/activate
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env`. The agent uses `gemini-3.5-flash-lite` by default; set `MODEL` to use another
Gemini model.

### Run locally

Two terminals, from the repo root:

```bash
uvicorn api.index:app --reload --port 8000 --env-file .env   # API (venv active)
pnpm dev                                                    # web app on http://localhost:3000
```

In development, Next.js proxies `/api/*` to the API on port 8000. Check it with
`curl localhost:3000/api/health`. `--env-file` loads `.env` into the API process (it needs `python-dotenv`, a dev
dependency); on Vercel the variables come from the project settings.

### Test and lint

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
ruff check . && ruff format --check . && pytest
```

CI runs the same checks on every push.

## Deploy

One Vercel project serves both parts: Next.js at the repo root and the FastAPI app in `api/index.py` as a single
Python function. Every push to `main` deploys to production through the Vercel Git integration.

- `vercel.json` rewrites `/api/:path*` to that function, bundles `emporio_agent/` and the data files it reads at
  runtime, runs it in `gru1` (São Paulo) and allows 120 s per request, above the worst-case turn of 6 model calls of
  15 s each.
- Python dependencies come only from `requirements.txt`. There is no `pyproject.toml` on purpose: when one exists,
  Vercel installs from it and ignores `requirements.txt`. Tool settings live in `ruff.toml` and `pytest.ini`.
- Environment variables (Project Settings > Environment Variables): `GEMINI_API_KEY`, marked Sensitive, for
  Production and Preview. `MODEL` and `REFERENCE_DATE` are optional and left unset in production, so the defaults
  `gemini-3.5-flash-lite` and `2026-03-23` apply.

Smoke test after a deploy:

```bash
curl https://emporio-agent-three.vercel.app/api/health
curl -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","text":"Quanto custa o violão Takamine GD20?"}],"locale":"pt-BR"}' \
  https://emporio-agent-three.vercel.app/api/chat
```

## Known limitations

- The per-IP rate limit (10 chat requests per minute) is kept in memory per function instance. On serverless,
  requests can land on different instances and cold starts reset the counters, so the effective limit can be higher.
  Next step: a Vercel Firewall rate-limit rule or a shared store (for example Redis) keyed by IP.

## License

[MIT](LICENSE)
