# Proposal

## Why

The approved design prototype showed the trace in a column to the right of the chat. `rich-cards-and-trace`
replaced it with a collapsed `<details>` under each reply, because the browser gives keyboard and screen-reader
behavior for free. That choice was never weighed against the side column. The collapsed panel hides the part of the
case that shows how an answer was produced, and a reader has to open it reply by reply. A side panel that is always
open keeps the tool calls in view next to the conversation.

## What Changes

- On viewports wider than 760 px, a trace panel sits to the right of the chat. It is always open, with no collapse
  control, and shows the trace of the latest agent reply: the user question it answers, each tool call with its
  localized label, identifier, arguments as a key/value list, localized outcome and duration, then the model call
  count, the turn duration and a note that cards and trace are built in Python from the tool results.
- With no agent reply yet, the panel shows an empty state.
- The per-reply `<details>` trace under each bubble is removed. Cards stay under the bubble.
- At 760 px and below the panel is hidden. A header button opens the same content as a bottom sheet dialog, with a
  close button, Esc and backdrop close, and focus returns to the button.
- The language toggle is restyled as in the prototype: a pill group whose active option is pink with dark text.
  Behavior is unchanged.
- Translation is unchanged: UI strings, greeting, suggestions, cards and the trace panel follow the toggle live,
  and replies already sent keep the language they were written in, as in the prototype.

Out of scope: choosing an older reply's trace (the panel follows the latest reply only), translating sent replies,
API or trace schema changes, prototype step kinds the API does not return (policy, guard, calc). No new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `turn-trace`: "Trace panel" is removed and replaced by "Trace side panel" (always open, latest reply) and "Trace
  sheet on narrow screens".
- `web-i18n`: "Language toggle" gains the pill style; its behavior is unchanged.
- `chat-ui`: "Agent reply is shown" and "Conversation survives a reload" no longer place a trace under the bubble;
  "Keyboard-only use" adds the panel button on narrow screens.

## Impact

- Web only: `components/TracePanel/`, new `components/TraceSheet/`, `components/ChatShell/`,
  `components/ChatApp/ChatApp.tsx`, `components/LanguageToggle/LanguageToggle.module.css`, `locales/*.json`.
- Tests: `__tests__/trace/TracePanel.test.tsx`, `__tests__/chat/ChatApp.test.tsx`, `__tests__/i18n/toggle.test.tsx`.
- `README.md` (web app section and the first paragraph).
- No API, Python, schema or storage change; stored histories load as before.
