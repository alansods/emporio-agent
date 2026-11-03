# Spec Delta

## ADDED Requirements

### Requirement: Chat endpoint runs one agent turn
The API SHALL expose `POST /api/chat`, which takes a JSON body `{messages, locale}` (the conversation so far, each
message with `role` `user` or `agent` and `text`, and locale `en` or `pt-BR`), runs one agent turn over it and
returns HTTP 200 with a JSON body containing `reply`.

#### Scenario: Successful turn
- **WHEN** a client posts `{"messages": [{"role": "user", "text": "Oi"}], "locale": "pt-BR"}` and the model answers "Olá!"
- **THEN** the response status is 200
- **AND** the body is the JSON object `{"reply": "Olá!"}`

#### Scenario: History and locale reach the agent
- **WHEN** a client posts three messages (user, agent, user) with locale `en`
- **THEN** the model receives those three messages in order
- **AND** the system prompt instructs the model to reply in English

#### Scenario: Tool turn
- **WHEN** a client asks for the Takamine GD20 price and the model calls `search_products` before answering
- **THEN** the response status is 200 and `reply` is the model's final text

### Requirement: Chat input limits
The API SHALL reject a chat request before calling the model, with HTTP 422 and body `{"error": "invalid_request"}`,
when the body is not valid JSON, has fields other than `messages` and `locale`, has 0 or more than 20 messages, has a
message whose trimmed text is empty or longer than 2000 characters, has an unknown role or locale, or does not end
with a `user` message.

#### Scenario: Too many messages
- **WHEN** a client posts 21 messages
- **THEN** the response status is 422
- **AND** the body is `{"error": "invalid_request"}`
- **AND** the model is not called

#### Scenario: Message too long
- **WHEN** a client posts a message of 2001 characters
- **THEN** the response status is 422

#### Scenario: Blank message
- **WHEN** a client posts a message whose text is only spaces
- **THEN** the response status is 422

#### Scenario: Last message from the agent
- **WHEN** a client posts history ending with an `agent` message
- **THEN** the response status is 422

#### Scenario: Unknown locale
- **WHEN** a client posts locale `es`
- **THEN** the response status is 422

#### Scenario: Empty or malformed body
- **WHEN** a client posts an empty message list, an extra field, or a body that is not JSON
- **THEN** the response status is 422
- **AND** the body does not echo the submitted input

#### Scenario: Limits are inclusive
- **WHEN** a client posts 20 messages, the last one 2000 characters long
- **THEN** the response status is 200

### Requirement: Per-IP rate limit
The API SHALL allow at most 10 chat requests per client IP in each 60-second window and answer further requests in
that window with HTTP 429, body `{"error": "rate_limited"}` and a `Retry-After` header in seconds, without calling
the model. The health endpoint SHALL NOT be rate limited.

#### Scenario: Eleventh request in a minute
- **WHEN** one client IP sends 11 chat requests within 60 seconds
- **THEN** the first 10 are answered normally
- **AND** the 11th gets status 429, body `{"error": "rate_limited"}` and a `Retry-After` header

#### Scenario: Other clients are unaffected
- **WHEN** one client IP has hit the limit and another client IP sends a chat request
- **THEN** the other client's request is answered normally

#### Scenario: Window resets
- **WHEN** a client IP has hit the limit and 60 seconds pass
- **THEN** its next chat request is answered normally

### Requirement: Model failures map to 503
When the agent cannot get a reply from the model (provider error, request timeout, empty response or missing API
key), the API SHALL answer HTTP 503 with body `{"error": "model_unavailable"}`, containing no prompt text, policy
text, API key or stack trace.

#### Scenario: Provider error
- **WHEN** the model client raises an error whose message contains the API key and policy text
- **THEN** the response status is 503
- **AND** the body is exactly `{"error": "model_unavailable"}`

#### Scenario: Missing API key
- **WHEN** `GEMINI_API_KEY` is not set and a client posts a valid chat request
- **THEN** the response status is 503
- **AND** `GET /api/health` still returns 200

### Requirement: Model request timeout
Every request the agent sends to the model provider SHALL carry a 15-second timeout, so one turn is bounded by the
agent's model call cap times that timeout.

#### Scenario: Timeout is set
- **WHEN** a turn sends a request to the model provider
- **THEN** the request is configured with a 15000 ms timeout

### Requirement: Unexpected errors are opaque
Any other unhandled error during a chat request SHALL return HTTP 500 with body `{"error": "internal_error"}` and no
stack trace or internal detail.

#### Scenario: Bug in a tool
- **WHEN** an unexpected exception is raised while a chat request is handled
- **THEN** the response status is 500
- **AND** the body is exactly `{"error": "internal_error"}`
