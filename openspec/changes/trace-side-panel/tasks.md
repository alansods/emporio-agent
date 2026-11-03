# Tasks

## 1. Web: trace side panel and narrow sheet (commit: `feat(web): move the turn trace to a side panel`)

- [ ] 1.1 Write failing tests: `__tests__/chat/latestTrace.test.ts` (last agent message with a trace and the user
  text before it; `null` for an empty history or one saved before cards); `__tests__/trace/TracePanel.test.tsx`
  rewritten for the `turn-trace` scenarios "Latest reply on desktop" (question, `search_products`, `name` = `GD20`
  in a `<dl>`, "1 product found", no collapse control), "Empty state", "Error outcome label", "Unknown error code",
  "Reply without tools", "Locale switch updates the panel"; `__tests__/chat/ChatApp.test.tsx` updated for "Panel
  follows the newest turn", "No trace under replies", "Narrow screen sheet" and
  "Closing the sheet" (header button opens the dialog, close button closes it), "Reload" showing the same latest trace and "History saved before cards" showing the empty
  state. Add `showModal`/`close` stubs to `vitest.setup.ts` (design D4). Verify `pnpm test` fails on them.
- [ ] 1.2 Implement design D1 to D4 and D6: `lib/chat/latestTrace.ts`, `TracePanel` as the panel body, the aside in
  `ChatShell` (new `aside` prop, row layout, hidden at 760 px), `components/TraceSheet` with the header button and
  native `<dialog>`, `ChatApp` without the trace in bubble footers, and the dictionary keys in `locales/en.json` and
  `locales/pt-BR.json` (unused summary keys removed). Verify `pnpm test` (with dictionary parity), `pnpm typecheck`,
  `pnpm lint`, `pnpm format:check` and `pnpm build` pass.

## 2. Web: pill language toggle (commit: `feat(web): restyle the language toggle`)

- [ ] 2.1 Confirm the `web-i18n` "Active option contrast" scenario is covered by the existing `on-pink` on `pink`
  and `text-muted` on `surface` pairs in `__tests__/tokens.test.ts`, and that `__tests__/i18n/toggle.test.tsx`
  still covers "Toggle state" and "Switching updates the document language". Verify `pnpm test` passes before the
  style change.
- [ ] 2.2 Implement design D5 in `components/LanguageToggle/LanguageToggle.module.css`. Verify `pnpm test`,
  `pnpm lint` and `pnpm format:check` pass.

## 3. Browser check (no commit unless it finds something)

- [ ] 3.1 With `pnpm dev` plus `uvicorn` (real key): at 1280 px ask for the GD20, then for order 7 with a wrong
  name. The panel shows each latest trace, bubbles show no trace, the toggle switches the panel and UI live and the
  sent replies stay as written, and reload keeps the panel. In a 360 px same-origin iframe: no aside, no
  horizontal scroll, the header button opens the sheet, Esc and a backdrop click close it and focus returns to the
  button. Keyboard-only and reduced motion pass. Record the result here; fix findings inside groups 1 or 2.

## 4. Docs (commit: `docs: describe the trace side panel`)

- [ ] 4.1 Update `README.md`: first paragraph and Web app section (trace in an always-open side panel, sheet on
  phones), and under Known limitations add that only the latest turn's trace is shown and that sent replies keep
  their language when the toggle changes. Verify `pnpm format:check` and `ruff format --check .` pass (ruff formats
  Markdown code blocks).
- [ ] 4.2 After push, CI green (`gh run list --limit 1`) and a prod smoke test on
  https://emporio-agent-three.vercel.app: GD20 in `pt-BR` shows the card and the `search_products` call in the
  panel ("Takamine GD20 in production"), and switching to EN re-labels the panel. Record the result here.

## Workflow follow-up

- `openspec validate trace-side-panel --strict`, then `/opsx:archive` and commit
  `docs(openspec): archive trace-side-panel`.
