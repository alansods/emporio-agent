# turn-trace Specification

## Purpose
A per-turn trace of the tool calls the agent made, their outcomes and timings, returned by the chat API and shown in
a side panel beside the chat, so a reader can check how an answer was produced.

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

### Requirement: Trace side panel
On viewports wider than 760 px the page SHALL show a trace panel beside the chat, always open, with no collapse
control. It SHALL show the latest agent reply's trace: the question it answers, each step's localized tool label,
tool identifier, arguments as a key/value list, localized outcome and duration, then the model call count and turn
duration. With no such reply it SHALL show an empty state. Agent bubbles SHALL NOT show a trace. All text SHALL
follow the active locale.

#### Scenario: Latest reply on desktop
- **WHEN** the viewport is 1280 px wide and the latest reply answered "Quanto custa o GD20?" with one search step
- **THEN** the panel beside the chat shows the question, `search_products` with argument `name` = `GD20` and the outcome "1 product found" in the active locale
- **AND** the panel has no collapse control

#### Scenario: Panel follows the newest turn
- **WHEN** a second turn completes with a `get_order_status` step
- **THEN** the panel shows that step and no longer shows the first turn's search

#### Scenario: Empty state
- **WHEN** the conversation has no agent reply
- **THEN** the panel shows the localized empty state text

#### Scenario: No trace under replies
- **WHEN** a reply with a trace is shown in the feed
- **THEN** its bubble shows the reply and its cards but no trace

#### Scenario: Error outcome label
- **WHEN** a step has outcome `error` with code `order_not_verified`
- **THEN** the panel shows the localized "not verified" label for that step

#### Scenario: Unknown error code
- **WHEN** a step has outcome `error` with a code the dictionary does not know
- **THEN** the panel shows the localized generic error label followed by the code

#### Scenario: Reply without tools
- **WHEN** the latest reply's trace has no steps
- **THEN** the panel reads "No tools used" in the active locale and still shows the model call count

#### Scenario: Locale switch updates the panel
- **WHEN** the panel shows a trace in `pt-BR` and the user switches to `en`
- **THEN** the panel's labels and outcomes are in English and the quoted question is unchanged

### Requirement: Trace sheet on narrow screens
At 760 px and below the side panel SHALL be hidden and a labelled header button SHALL open the same trace content
in a modal bottom sheet. The sheet SHALL close with its close button, Esc or a backdrop click, return focus to the
header button, and fit a 360 px viewport without horizontal scroll.

#### Scenario: Narrow screen sheet
- **WHEN** the viewport is 360 px wide and the user activates the header trace button
- **THEN** a modal dialog shows the latest reply's trace without horizontal scroll

#### Scenario: Closing the sheet
- **WHEN** the sheet is open and the user presses Esc
- **THEN** the sheet closes and focus returns to the header trace button
