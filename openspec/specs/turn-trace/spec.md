# turn-trace Specification

## Purpose
A per-turn trace of the tool calls the agent made, their outcomes and timings, returned by the chat API and shown in
a collapsible panel, so a reader can check how an answer was produced.

## Requirements

### Requirement: Trace in the chat response
The chat response SHALL include `trace` with `model_calls`, the whole-turn `duration_ms` and `steps`, one per tool
call in execution order. Each step SHALL have `tool`, `arguments` as sent by the model, `duration_ms` and an
`outcome`: `products` with the search's `count`, `order` for a verified order, or `error` with the tool's `code`.
The trace SHALL NOT contain tool results or the system prompt.

#### Scenario: Turn without tools
- **WHEN** the model answers right away
- **THEN** `trace.steps` is `[]` and `trace.model_calls` is 1

#### Scenario: Search step
- **WHEN** the model calls `search_products` with `{"name": "GD20"}` once, the search finds 1 product, and the model then answers
- **THEN** `trace.steps` has one step with tool `search_products`, arguments `{"name": "GD20"}`, outcome `products` with count 1, and a non-negative `duration_ms`
- **AND** `trace.model_calls` is 2

#### Scenario: Failed identity check
- **WHEN** `get_order_status` returns `order_not_verified`
- **THEN** the step's outcome is `error` with code `order_not_verified` and the trace holds no order data

#### Scenario: Round limit reached
- **WHEN** the turn stops at the tool round limit and returns the fallback reply
- **THEN** `trace.steps` lists every tool call that ran

### Requirement: Trace panel
Each agent reply that has a trace SHALL show a collapsed, keyboard-operable disclosure under its bubble. Its
summary SHALL state the number of tool calls and the turn duration in seconds; expanded, it SHALL list each step's
localized tool label, tool identifier, arguments as JSON, localized outcome and duration, plus the model call
count. All text SHALL follow the active locale and the panel SHALL fit a 360 px viewport.

#### Scenario: Collapsed by default
- **WHEN** a reply with one search step is shown
- **THEN** the panel is closed and its summary reads "1 tool call" and the duration in seconds in the active locale

#### Scenario: Keyboard toggle
- **WHEN** a keyboard user focuses the panel summary and presses Enter
- **THEN** the panel opens and shows the step with its localized outcome, for example "1 product found"

#### Scenario: Error outcome label
- **WHEN** a step has outcome `error` with code `order_not_verified`
- **THEN** the panel shows the localized "not verified" label for that step

#### Scenario: Unknown error code
- **WHEN** a step has outcome `error` with a code the dictionary does not know
- **THEN** the panel shows the localized generic error label followed by the code

#### Scenario: Reply without tools
- **WHEN** a reply's trace has no steps
- **THEN** the summary reads "No tools used" in the active locale and the model call count is still available when expanded
