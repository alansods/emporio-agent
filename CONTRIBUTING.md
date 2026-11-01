# Contributing

## Workflow

Work is spec-driven with [OpenSpec](https://github.com/Fission-AI/OpenSpec):

1. Propose a change in `openspec/changes/<change-id>/` (proposal, spec deltas, design, tasks).
2. Turn each `#### Scenario:` into a failing test.
3. Implement until the tests pass.
4. Validate (`openspec validate <change-id> --strict`) and archive the change.

## Commits

- [Conventional Commits](https://www.conventionalcommits.org/), short and imperative: `feat(api): add order lookup tool`.
- One commit per task group in `tasks.md`. Every commit passes lint and tests.
- No force-push. Fix mistakes with a new commit.

## Before pushing

```bash
pnpm lint && pnpm typecheck && pnpm test
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

## Conventions

- English for code, comments, commits and docs. Portuguese only in store data, policy text and `locales/pt-BR.json`.
- Never commit `.env` or other secrets.
