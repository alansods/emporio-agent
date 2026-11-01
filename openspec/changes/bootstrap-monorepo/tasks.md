# Tasks

## 1. Repo hygiene (`chore: add repo hygiene files`)

- [x] 1.1 Add `LICENSE` (MIT), `.editorconfig`, `.nvmrc` (22), `.env.example` (`GEMINI_API_KEY`, `MODEL`, `REFERENCE_DATE` with comments) and a short `CONTRIBUTING.md`; verify `git status` lists only these files
- [x] 1.2 Verify `.gitignore` covers env files, build output, `.vercel/` and `docs/`; verify `git status --ignored` shows local-only files as ignored, not untracked

## 2. Python API skeleton (`feat(api): add health endpoint`)

- [x] 2.1 Add `requirements.txt` (fastapi), `requirements-dev.txt` (pytest, ruff, httpx2) and `pyproject.toml` (ruff, pytest config); verify `uv venv --python 3.12 && uv pip install -r requirements.txt -r requirements-dev.txt` succeeds
- [x] 2.2 Write `tests/test_health.py` from the `chat-api` scenarios (200 + `{"status": "ok"}`, works without API key, unknown path returns JSON 404 without traceback); verify it fails
- [x] 2.3 Implement `api/index.py` exporting `app` with `GET /api/health` and the JSON HTTP error handler; verify `pytest` and `ruff check . && ruff format --check .` pass in the activated venv

## 3. Next.js skeleton (`chore(web): scaffold next.js app with strict typescript`)

- [x] 3.1 Scaffold Next.js App Router at the repo root with pnpm, TypeScript strict, no Tailwind, `packageManager` pinned; verify `pnpm build` succeeds
- [x] 3.2 Configure ESLint + Prettier and scripts `dev`, `build`, `lint`, `format`, `typecheck`, `test`; verify `pnpm lint && pnpm typecheck` pass
- [x] 3.3 Configure Vitest (jsdom, React Testing Library, jest-dom) with one smoke test; verify `pnpm test` passes
- [x] 3.4 Add the dev-only `/api/:path*` rewrite to `http://127.0.0.1:8000` in `next.config.ts`; verify `curl localhost:3000/api/health` returns `{"status":"ok"}` with both servers running

## 4. Dark app shell (`feat(web): add dark design tokens and app shell`)

- [ ] 4.1 Write `__tests__/tokens.test.ts`: parses `styles/tokens.css`, asserts `color-scheme: dark` and WCAG AA contrast for the text pairs listed in design.md; verify it fails
- [ ] 4.2 Write `__tests__/home.test.tsx` from the `chat-ui` scenarios (banner with brand name, `aria-hidden` glyph, main landmark with `aria-live="polite"`, no theme toggle) and a test that `globals.css` contains the reduced-motion rule; verify they fail
- [ ] 4.3 Add `styles/tokens.css` and `styles/globals.css` (dark only, focus ring, reduced motion), load Sora and Inter with `next/font`; verify the token test passes
- [ ] 4.4 Implement `app/layout.tsx`, `app/page.tsx`, `components/Header` (CSS Module, guitar SVG glyph) and an empty chat area; verify the home tests pass and the page has no horizontal scroll at 360 px in browser devtools

## 5. CI and docs (`ci: run lint and tests for web and api`, `docs: add setup instructions`)

- [ ] 5.1 Add `.github/workflows/ci.yml` with `web` and `api` jobs; verify both jobs pass on GitHub after push
- [ ] 5.2 Replace the placeholder README with title, one-line summary and local setup, run and test commands; verify each command runs as written on a clean clone

## Workflow follow-up

- Run `openspec validate bootstrap-monorepo --strict` before archiving.
- Archive with `/opsx:archive` and commit the archived change (`docs(openspec): archive bootstrap-monorepo`).
- Verify `git log --format=full` shows no trailers.
