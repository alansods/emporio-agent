# support-agent Specification

## Purpose
Runs one stateless chat turn of the store's support agent: it gives the model the persona, rules and policy manual,
lets it call the catalog and order tools, and returns the reply together with a record of the tools it used.

## Requirements

### Requirement: Stateless turn over client-sent history
A turn SHALL take the conversation as an ordered list of text messages with role `user` or `agent`, ending with a
`user` message, plus a locale (`en` or `pt-BR`), and SHALL keep no state between turns.

#### Scenario: Prior messages reach the model
- **WHEN** a turn runs with history [user "Oi", agent "Olá!", user "Quanto custa o Takamine GD20?"]
- **THEN** the first model request contains those three messages in that order

#### Scenario: Turns are independent
- **WHEN** two turns run one after the other with different histories
- **THEN** the second model request contains only the second turn's messages

### Requirement: System prompt content
Every model request SHALL carry a system prompt with the store persona, the rule to answer price, stock and
promotion only from a tool result in the same turn, the scope rules for accessories and unrelated topics, the
contact phone and email, the reference date, and the full policy manual text. It SHALL also instruct the model to
quote tool values exactly as returned, to format replies only with paragraphs, `**bold**` and `- ` bullet lists, and
to pass every search filter the question allows.

#### Scenario: Prompt carries the manual and facts
- **WHEN** a turn runs
- **THEN** the system prompt contains the full text of `data/politicas.txt`
- **AND** it contains "(67) 3341-4444", "contato@emporiodamusica.com.br" and the reference date in ISO 8601

#### Scenario: Prompt asks for exact tool values
- **WHEN** a turn runs
- **THEN** the system prompt instructs the model to copy prices, installments and dates exactly as the tool returned
  them, without rounding or rewriting them

#### Scenario: Prompt limits the Markdown
- **WHEN** a turn runs
- **THEN** the system prompt allows only paragraphs, `**bold**` and lists whose lines start with "- "
- **AND** it forbids headings, tables, numbered lists and links

#### Scenario: Prompt asks for narrow searches
- **WHEN** a turn runs
- **THEN** the system prompt instructs the model to use the category, price and availability filters of
  `search_products` whenever the question gives them

### Requirement: Prompt order rules
The system prompt SHALL instruct the model to ask for the order owner's full name or email before calling
`get_order_status`, and to cite the return windows still open when the one the customer asked about is closed.

#### Scenario: Prompt asks for identity before order lookup
- **WHEN** a turn runs
- **THEN** the system prompt instructs the model not to call `get_order_status` before the customer gives the full
  name or email of the order owner
- **AND** it forbids filling `name_or_email` with the order number or any other text

#### Scenario: Prompt asks to cite open return windows
- **WHEN** a turn runs
- **THEN** the system prompt instructs the model to take deadlines from the order's `return_windows` instead of
  counting days
- **AND** when the requested window is closed, to also cite the windows still open with their deadlines

### Requirement: Reply language follows the locale
The system prompt SHALL instruct the model to reply in English for locale `en` and in Brazilian Portuguese for
locale `pt-BR`, while data and policies stay in Portuguese.

#### Scenario: English locale
- **WHEN** a turn runs with locale `en`
- **THEN** the system prompt instructs the model to reply in English

#### Scenario: Portuguese locale
- **WHEN** a turn runs with locale `pt-BR`
- **THEN** the system prompt instructs the model to reply in Brazilian Portuguese

### Requirement: Tool calls are executed and fed back
When the model requests tool calls, the agent SHALL run every requested call with the given arguments, send each
result back to the model, and repeat until the model answers with text only. That text SHALL be the reply.

#### Scenario: One tool round
- **WHEN** the model first requests `search_products` with name "Takamine GD20", then answers with text
- **THEN** the tool runs once with that argument
- **AND** the second model request contains the tool result
- **AND** the reply is the model's text

#### Scenario: Several calls in one response
- **WHEN** the model requests `search_products` and `get_order_status` in the same response
- **THEN** both tools run and both results go back to the model in the next request

### Requirement: Tool call record
A turn SHALL return, besides the reply, the ordered list of tool calls it ran, each with tool name, arguments,
result and duration in milliseconds, and the number of model calls it made, so callers can build cards and a trace
without asking the model.

#### Scenario: Record matches the calls
- **WHEN** a turn runs one `search_products` call and then answers
- **THEN** the turn returns one record with name `search_products`, the call's arguments, the tool's result and a non-negative duration
- **AND** the turn reports 2 model calls

#### Scenario: No tools used
- **WHEN** the model answers with text right away
- **THEN** the turn returns the reply, an empty tool call list and 1 model call

### Requirement: Tool errors go back to the model
A tool call with an unknown tool name or invalid arguments SHALL produce an error result that is sent to the model
and recorded, and SHALL NOT end the turn.

#### Scenario: Invalid arguments
- **WHEN** the model requests `search_products` with an argument the tool does not accept, then answers with text
- **THEN** the model receives an error result for that call
- **AND** the turn returns the model's reply

#### Scenario: Unknown tool
- **WHEN** the model requests a tool named `delete_order`, then answers with text
- **THEN** the model receives an error result for that call
- **AND** the turn returns the model's reply

### Requirement: Tool round limit
A turn SHALL run at most 5 tool rounds. If the model still requests tools after the fifth round, the turn SHALL end
with a fixed fallback reply in the turn's locale that points to the store phone, plus the record of calls already
run.

#### Scenario: Model keeps calling tools
- **WHEN** the model requests a tool call in every response
- **THEN** the model is called 6 times and tools run in 5 rounds
- **AND** the reply is the fallback message in the turn's locale containing "(67) 3341-4444"

### Requirement: Model failures are reported without internals
When the model provider fails or returns no usable content, the turn SHALL fail with a single agent error type whose
message contains no system prompt text, API key or provider stack trace.

#### Scenario: Provider error
- **WHEN** the model client raises an error during a turn
- **THEN** the turn raises the agent error
- **AND** the error message contains neither the policy manual text nor the API key

### Requirement: Model choice by environment
The agent SHALL use the model named by the `MODEL` environment variable, defaulting to `gemini-3.5-flash-lite`, and
read the API key only from `GEMINI_API_KEY` on the server.

#### Scenario: Default model
- **WHEN** `MODEL` is not set and a turn runs
- **THEN** the model request names `gemini-3.5-flash-lite`

#### Scenario: Overridden model
- **WHEN** `MODEL` is `gemini-3.8-pro` and a turn runs
- **THEN** the model request names `gemini-3.8-pro`

### Requirement: Superlative questions use pick
The system prompt SHALL instruct the model to pass `pick` to `search_products` when the customer asks for the
cheapest or the most expensive product, together with the other filters the question gives.

#### Scenario: Prompt asks for pick
- **WHEN** a turn runs
- **THEN** the system prompt instructs the model to use `pick` `cheapest` for the cheapest product and `pick`
  `most_expensive` for the most expensive one
