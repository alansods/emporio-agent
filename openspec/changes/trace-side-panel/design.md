# Design

## Context

- `ChatApp` renders each history message as a `MessageBubble` whose footer holds `AnswerCards` and `TracePanel`.
  `TracePanel` is a `<details>` with a summary line ("How I answered · 1 tool call · 2.3 s") and a body with one
  `<li>` per step: label, `<code>` identifier, duration, `JSON.stringify` arguments in a `<pre>`, outcome label,
  then the model call count. Its label logic (`toolLabel`, `outcomeLabel` with `isMessageKey` fallback) and
  `formatSeconds` are reused as they are.
- `ChatShell` is `<main>` with one panel (feed, alert, composer). At 760 px and below it drops padding and radius.
- History (`historyStore`, `emporio.history.v1`) already stores `trace` per agent message, so the latest trace and
  the user text before it can be derived from the history. No storage or API change.
- The prototype (`project/Main.dc.html` in the approved design artifact) draws the aside at 360 px with
  `--surface`, `--border` and `--radius-lg`, a heading with a terminal icon, "Answer to" plus the question in
  italics, step cards on `--surface-sunken` with an uppercase kind label in `--blue-text`, arguments as a `<dl>`
  grid on `--bg` in mono 12 px, and a footnote. Its toggle is a 999 px pill, active option `--pink` / `--on-pink`.
- jsdom 30 does not implement `HTMLDialogElement.showModal`.

## Goals / Non-Goals

**Goals:**

- The trace of the latest turn is visible without a click on desktop.
- Narrow screens keep access to the trace without a horizontal layout.
- The visual match with the approved prototype, using existing tokens only.

**Non-Goals:**

- Selecting an older reply's trace, a collapse control, or step kinds the API does not return.
- Translating replies already sent.

## Decisions

**D1. Side panel instead of a disclosure per reply.** This reverses `rich-cards-and-trace` D8. D8 picked
`<details>` because the browser gives keyboard and screen-reader behavior for free, but it hid the trace behind one
click per reply, and the trace is the part of the case that shows how an answer was produced. The side panel keeps
that in view. Accessibility still comes from plain markup: `<aside aria-labelledby>` with an `<h2>`, an `<ol>` of
steps and a `<dl>` of arguments. Alternative considered: keep the disclosure and open it by default. Rejected: it
pushes the conversation down, one panel per reply.

**D2. Latest turn only.** The panel shows the last agent message that has a `trace`, and the question is the user
message right before it. Derived in `ChatApp` with a small pure helper (`latestTrace(history)` in
`lib/chat/latestTrace.ts`) so it is unit-tested. While a turn is pending, the panel keeps the previous trace.
Alternative considered: a "show trace" button per reply as in the prototype. Rejected by the user; one panel that
follows the conversation is simpler.

**D3. Arguments as a key/value list.** Each argument becomes `<dt>key</dt><dd>value</dd>`. Strings and numbers are
shown as they are, other values with `JSON.stringify`. `overflow-wrap: anywhere` keeps long values inside 360 px.

**D4. Narrow screens: header button plus native `<dialog>`.** The aside is hidden at 760 px and below, and a header
icon button (`aria-label` "How the agent answered", hidden above 760 px with `display: none`, so it is not in the
desktop Tab order) opens `<dialog>` with `showModal()`. The native dialog gives the modal semantics, the focus trap,
Esc to close and focus return. A click on the dialog element itself, outside its content box, closes it (backdrop).
Both the aside and the sheet render the same `TracePanel` body. Tests stub `showModal`/`close` in
`vitest.setup.ts`, because jsdom lacks them; Esc and focus return are checked in the browser. Alternative
considered: a hand-made `role="dialog"` div. Rejected: it needs its own focus trap and Esc handling.

**D5. Toggle style only.** `LanguageToggle.module.css` changes to the pill: `border-radius: 999px`, `padding: 3px`,
`--surface` background, options `min-height: 36px`, `padding: 0 14px`, active `--pink` with `--on-pink`. Both pairs
are already in the token contrast test (`on-pink` on `pink`, `text-muted` on `surface`), so no new test token is
needed; the scenario points at that existing check. Options use `min-height: 38px` (the prototype's 36 px plus
2 px), so with the 3 px group padding the toggle is 44 px tall.

**D6. Layout.** `ChatShell` gets an `aside` prop and becomes a row with `gap: var(--space-4)`. The chat panel is
`flex: 1; min-width: 0`, and the aside is `flex: 0 0 360px` with its own `overflow-y: auto`. At 760 px and below the
aside gets `display: none`. Keys changed in both dictionaries: `trace.title` becomes "How the agent answered" /
"Como o agente respondeu", plus new `trace.answerTo`, `trace.empty`, `trace.footnote`, `trace.kindTool`,
`trace.close`. The summary-only keys (`trace.toolCalls_*`) are removed if nothing else uses them; the parity tests
cover the rest.

## Risks / Trade-offs

- [Only the latest trace is visible] An older reply's tool calls cannot be inspected → acceptable for a demo; the
  README lists it under limitations.
- [Reversing an archived decision] The archived design keeps D8 as history; this change records why it is reversed.
- [jsdom stubs for `<dialog>`] Unit tests cannot prove Esc and focus return → the browser check in tasks covers it.
