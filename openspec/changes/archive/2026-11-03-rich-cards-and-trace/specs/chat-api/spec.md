## MODIFIED Requirements

### Requirement: Chat endpoint runs one agent turn
The API SHALL expose `POST /api/chat`, which takes a JSON body `{messages, locale}` (the conversation so far, each
message with `role` `user` or `agent` and `text`, and locale `en` or `pt-BR`), runs one agent turn over it and
returns HTTP 200 with a JSON body `{reply, cards, trace}`: the model's final text, the cards built from the turn's
tool results (`answer-cards`) and the turn trace (`turn-trace`).

#### Scenario: Successful turn
- **WHEN** a client posts `{"messages": [{"role": "user", "text": "Oi"}], "locale": "pt-BR"}` and the model answers "Olá!" without tools
- **THEN** the response status is 200
- **AND** the body has `reply` "Olá!", `cards` `[]`, and a `trace` with no steps and `model_calls` 1

#### Scenario: History and locale reach the agent
- **WHEN** a client posts three messages (user, agent, user) with locale `en`
- **THEN** the model receives those three messages in order
- **AND** the system prompt instructs the model to reply in English

#### Scenario: Tool turn
- **WHEN** a client asks for the Takamine GD20 price and the model calls `search_products` before answering
- **THEN** the response status is 200 and `reply` is the model's final text
- **AND** `cards` holds the GD20 product card and `trace` holds one `search_products` step
