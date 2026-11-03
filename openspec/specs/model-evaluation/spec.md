# model-evaluation Specification

## Purpose
A manual check of the real model's behavior: it runs fixed cases through the chat API, checks the tool calls each
turn made from the response trace, and records the example conversations shipped in `examples/`.

## Requirements

### Requirement: Manual run with the real key only
The behavior check SHALL run only when started by hand, read `GEMINI_API_KEY` from the environment or `.env`, and
never run as part of the automated test suite or CI. Without a key it SHALL stop with a clear message before any
model call.

#### Scenario: Missing key
- **WHEN** the check is started with no `GEMINI_API_KEY` set
- **THEN** it prints that the key is missing, makes no model call and exits with a non-zero status

### Requirement: Turns go through the chat API
Every case and example turn SHALL be sent as a chat request (`messages`, `locale`) to the same chat endpoint the UI
uses, so the response is checked with its `reply`, `cards` and `trace`. The per-IP rate limit SHALL NOT apply to
these requests.

#### Scenario: Full response is used
- **WHEN** a turn runs
- **THEN** the check reads the tool calls from the response `trace.steps`

#### Scenario: More than ten turns in one run
- **WHEN** a run sends more than ten chat requests within a minute
- **THEN** none of them is rejected with `rate_limited`

### Requirement: Expected tool calls per turn
Each turn SHALL declare its expected tool calls: the tool name, key arguments and, when relevant, the outcome. A
turn SHALL pass only when every expected call matches a trace step and no step uses a tool that is not expected. A
turn that expects no tool SHALL pass only with an empty trace. Wording of the reply SHALL NOT be checked.

#### Scenario: Matching call passes
- **WHEN** a turn expects `search_products` with category "Violões" and `max_price` at most 1000
- **AND** the trace has one `search_products` step with category "Violões", `max_price` 1000 and `only_available`
  true
- **THEN** the turn passes

#### Scenario: Name argument matches by words
- **WHEN** a turn expects `search_products` whose name contains "GD20"
- **AND** the trace step has name "takamine gd20"
- **THEN** the turn passes

#### Scenario: Wrong argument fails
- **WHEN** a turn expects `get_order_status` with `order_id` 7
- **AND** the trace step has `order_id` 6
- **THEN** the turn fails and the report names the mismatched argument

#### Scenario: Unexpected tool fails
- **WHEN** a turn expects no tool call
- **AND** the trace has a `search_products` step
- **THEN** the turn fails

#### Scenario: Expected outcome
- **WHEN** a turn expects `get_order_status` to end with error `order_not_verified`
- **AND** the trace step outcome is an order
- **THEN** the turn fails

### Requirement: Behavior cases
The check SHALL run about nine single-turn cases covering: a product price in Portuguese and one in English
(`search_products` by name), acoustic guitars up to a price (category and price filters), the cheapest electric
guitar (category filter and pick `cheapest`), an order with the owner's full name (`get_order_status`), an order
with a wrong name (outcome `order_not_verified`), an order without name or email, an accessory request and an
off-topic request (no tool call for the last three).

#### Scenario: Report and exit status
- **WHEN** a run ends
- **THEN** it prints one pass or fail line per case and per example turn with the trace steps of failures
- **AND** it exits with status 0 only when every case and every example turn passed

#### Scenario: Cheapest product case
- **WHEN** the case "Qual a guitarra mais barata?" runs
- **THEN** it passes only if the turn calls `search_products` with category "Guitarras" and pick `cheapest`

### Requirement: Example conversations are recorded
The check SHALL run the five example conversations of the brief turn by turn, each turn sending the history so far,
and write each one to its own Markdown file under `examples/`: available acoustic guitars up to R$ 1000, price of
the Takamine GD20, regret return of order 7 with identity check, store address then a request for strings, and a
conversation in English.

#### Scenario: Example file content
- **WHEN** a conversation is recorded
- **THEN** its file has a title, one line on what it shows, the model, the reference date and the recording date
- **AND** each turn shows the customer message, the agent reply and the tool calls with their arguments and outcome

#### Scenario: Failed conversation keeps the previous file
- **WHEN** any turn of a conversation fails its expected tool calls
- **THEN** that conversation's existing file is left unchanged
