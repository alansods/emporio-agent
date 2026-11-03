## MODIFIED Requirements

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
