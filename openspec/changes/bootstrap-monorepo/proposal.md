# Proposal

## Why

The repo is empty apart from the OpenSpec setup. Every later change (agent core, chat API, UI, deploy) needs one
agreed layout, toolchain and CI pipeline, so they can land as small, tested commits from the start. Doing this first
also proves the Vercel-friendly layout (Next.js at the root, Python function in `api/`) before any feature depends on it.

## What Changes

- Next.js App Router app at the repo root, TypeScript strict, pnpm, ESLint + Prettier, Vitest + React Testing Library.
- Design tokens (`styles/tokens.css`) and global styles: dark only, `color-scheme: dark`, Sora + Inter via `next/font`.
- A minimal home page: app shell with the "Empório da Música" brand, a small guitar SVG glyph and an empty chat area.
- FastAPI app at `api/index.py` exporting `app`, with `GET /api/health`.
- Python toolchain: Python 3.12 via `uv`, `requirements.txt` (runtime), `requirements-dev.txt` (pytest, ruff, httpx2),
  `pyproject.toml` for ruff and pytest settings.
- Local dev: `next.config` rewrite of `/api/*` to `http://127.0.0.1:8000` in development only.
- GitHub Actions workflow: lint + type-check + tests for web and api on every push and pull request.
- Repo hygiene: `LICENSE` (MIT), `.editorconfig`, `.env.example`, `CONTRIBUTING.md`, `.nvmrc`, placeholder README
  with run instructions.

New dependencies (all standard for the chosen stack, see `openspec/project.md`): `next`, `react`, `react-dom`,
`typescript`, `eslint` + `eslint-config-next`, `prettier` + `eslint-config-prettier`, `vitest`,
`@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`;
`fastapi`; dev: `pytest`, `ruff`, `httpx2` (needed by FastAPI's `TestClient`), `uvicorn` (local server only; Vercel
runs the ASGI app without it). TanStack Query, Zod and `google-genai` are added later by the changes that use them.

Out of scope:

- Moving the prototype, CSV data and policy text (`agent-core-and-tools`).
- `POST /api/chat`, limits, rate limiting (`chat-api`).
- i18n, chat components, cards, trace panel.
- `vercel.json` and the real deploy (`vercel-deployment`). Only the layout is made compatible now.

## Capabilities

### New Capabilities

- `chat-api`: the HTTP API served by the Python function. This change adds only the health check.
- `chat-ui`: the web chat interface. This change adds only the dark app shell and its accessibility baseline.

### Modified Capabilities

None.

## Impact

- New top-level folders: `app/`, `components/`, `styles/`, `api/`, `tests/`, `__tests__/`, `.github/workflows/`.
- New files: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`,
  `.prettierrc`, `vitest.config.ts`, `requirements.txt`, `requirements-dev.txt`, `pyproject.toml`, hygiene files.
- CI runs on every push. No secrets needed yet.
