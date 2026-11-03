## MODIFIED Requirements

### Requirement: Agent reply is shown
On a successful response the feed SHALL append the user message and the agent `reply` to the history, render the
reply as an agent bubble, and move the feed to the newest message. The reply SHALL be rendered with a small
Markdown subset only: blank-line-separated paragraphs, single line breaks kept, `**text**` as bold, and consecutive
lines starting with `- ` or `* ` as a bulleted list. Everything else, including HTML tags, SHALL be shown as literal
text; the reply is never inserted as HTML.

#### Scenario: Successful turn
- **WHEN** the API answers 200 with `{"reply": "Olá!", "cards": [], "trace": {...}}`
- **THEN** the feed shows the user bubble followed by an agent bubble with "Olá!"
- **AND** the typing indicator is gone

#### Scenario: Reply text is not interpreted as HTML
- **WHEN** the reply is `<b>oi</b>`
- **THEN** the agent bubble shows the literal text `<b>oi</b>` and contains no `b` element

#### Scenario: Bold and list
- **WHEN** the reply is "Temos:\n\n* **Yamaha C40:** R$ 599,90\n* **Yamaha F310:** R$ 699,90"
- **THEN** the bubble shows a paragraph "Temos:" and a list of two items whose product names are bold
- **AND** no `*` characters are visible

#### Scenario: Unmatched markers stay literal
- **WHEN** the reply is "5 * 3 e **sem fechamento"
- **THEN** the bubble shows exactly "5 * 3 e **sem fechamento"

#### Scenario: Takamine GD20 in production
- **WHEN** a user on the production URL in `pt-BR` sends "Quanto custa o violão Takamine GD20?"
- **THEN** the agent bubble shows R$ 2.199,00, PIX R$ 2.089,05 and 12x R$ 183,25
- **AND** a product card for the GD20 and a trace panel appear under it

### Requirement: Response shape is validated
The client SHALL validate a 200 response body before using it and SHALL treat a body without a string `reply`, or
with `cards` or `trace` present but of the wrong shape, as a failed turn. Missing `cards` SHALL be read as an empty
list and a missing `trace` as no trace. Unknown fields SHALL be ignored, so later response fields do not break this
client.

#### Scenario: Malformed success body
- **WHEN** the API answers 200 with `{"answer": "x"}`
- **THEN** the generic error message is shown and nothing is added to the history

#### Scenario: Extra fields
- **WHEN** the API answers 200 with `{"reply": "Oi", "cards": [], "extra": 1}`
- **THEN** the reply is shown normally

#### Scenario: Malformed card
- **WHEN** the API answers 200 with `{"reply": "Oi", "cards": [{"type": "product"}]}`
- **THEN** the generic error message is shown and nothing is added to the history

#### Scenario: Reply only
- **WHEN** the API answers 200 with `{"reply": "Oi"}`
- **THEN** the reply is shown with no cards and no trace panel

### Requirement: Conversation survives a reload
The history SHALL be saved in the browser's local storage after every successful turn and restored when the page
loads, including each agent reply's cards and trace. Requests SHALL send only each message's `role` and `text`.
Stored data that is missing, unreadable or of the wrong shape SHALL be treated as an empty conversation; stored
messages saved before cards existed SHALL load as messages without cards or trace.

#### Scenario: Reload
- **WHEN** a user completes a turn that returned a product card and reloads the page
- **THEN** the feed shows the same user and agent messages in the same order, with the same card and trace panel

#### Scenario: Corrupted storage
- **WHEN** the stored value is not valid JSON or has the wrong shape
- **THEN** the page shows the greeting and no error

#### Scenario: History saved before cards
- **WHEN** storage holds messages with only `role` and `text`
- **THEN** they are shown as before, without cards or trace panels

#### Scenario: Request strips cards and trace
- **WHEN** the history holds an agent message with cards and trace and the user sends a new message
- **THEN** every message in the request body has only `role` and `text`
