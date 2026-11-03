# Empório da Música support agent

Customer support chat agent for Empório da Música, a fictional musical instrument store in Campo Grande, MS. A Python
agent (FastAPI, Gemini function calling) answers from the store's data and policy manual; a Next.js web app renders
the chat.

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

## License

[MIT](LICENSE)
