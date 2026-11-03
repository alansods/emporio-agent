# chat-ui Specification

## Purpose
Web chat interface where customers talk to the store agent. It covers the app shell, the visual baseline and the
accessibility guarantees every later UI feature builds on.

## Requirements

### Requirement: Dark-only app shell
The web app SHALL render a single dark theme declared with `color-scheme: dark`, and SHALL NOT offer any control to
switch to a light theme.

#### Scenario: Dark theme on load
- **WHEN** a user opens the home page
- **THEN** the root element declares `color-scheme: dark`
- **AND** no theme toggle is present in the page

#### Scenario: Light system preference is ignored
- **WHEN** the user's operating system prefers a light color scheme
- **THEN** the page still renders the dark theme

### Requirement: Store branding in the header
The home page SHALL show a header with the brand name "Empório da Música" and a decorative guitar glyph that is
hidden from assistive technology.

#### Scenario: Brand is visible and accessible
- **WHEN** a user opens the home page
- **THEN** a banner landmark contains the text "Empório da Música"
- **AND** the guitar glyph has `aria-hidden="true"`

### Requirement: Chat area landmark
The home page SHALL contain a main landmark with a message feed region marked `aria-live="polite"`, so later
messages are announced to screen readers.

#### Scenario: Feed is a live region
- **WHEN** a user opens the home page
- **THEN** the main landmark contains an element with `aria-live="polite"`

### Requirement: Responsive from 360 px
The app shell SHALL render without horizontal scrolling at viewport widths from 360 px upward.

#### Scenario: Narrow phone
- **WHEN** the viewport is 360 px wide
- **THEN** the page has no horizontal scroll

### Requirement: Reduced motion respected
The app SHALL disable non-essential animations and transitions when the user prefers reduced motion.

#### Scenario: Reduced motion preference
- **WHEN** the user's system sets `prefers-reduced-motion: reduce`
- **THEN** animation and transition durations are effectively zero

### Requirement: Greeting and suggestions on an empty conversation
When the conversation has no messages, the feed SHALL show a localized greeting from the agent and a set of
localized suggestion buttons. Choosing a suggestion SHALL send its text as the user's message. The greeting is not
part of the conversation history and is never sent to the API.

#### Scenario: First visit
- **WHEN** a user opens the home page with no stored conversation
- **THEN** the feed shows the greeting and at least one suggestion button
- **AND** no request is sent to `/api/chat`

#### Scenario: Picking a suggestion
- **WHEN** the user activates a suggestion button
- **THEN** a chat request is sent whose only message is the suggestion text with role `user`
- **AND** the suggestions are no longer shown

### Requirement: Composer sends messages
The page SHALL provide a labelled multi-line text field and a send button. Enter or the send button SHALL send the
trimmed text; Shift+Enter SHALL insert a line break. Blank text SHALL NOT be sent. While a turn is pending, the send
button and Enter SHALL NOT start another request.

#### Scenario: Enter sends
- **WHEN** the user types "Oi" and presses Enter
- **THEN** one chat request is sent ending with the message `{"role": "user", "text": "Oi"}`
- **AND** the text field is cleared

#### Scenario: Shift+Enter adds a line
- **WHEN** the user types "a", presses Shift+Enter and types "b"
- **THEN** no request is sent
- **AND** the text field contains "a" and "b" on two lines

#### Scenario: Blank message
- **WHEN** the text field holds only spaces and the user presses Enter
- **THEN** no request is sent

#### Scenario: No double send
- **WHEN** a turn is pending and the user presses Enter again with new text
- **THEN** no second request is sent until the first one settles

### Requirement: Message length cap
The composer SHALL accept at most 2000 characters per message, the same limit the chat API enforces, so a typed
message is never rejected by the API for its length.

#### Scenario: Text over the limit
- **WHEN** the user pastes 2500 characters into the text field
- **THEN** the field holds 2000 characters

### Requirement: Request carries trimmed history and locale
Each chat request SHALL be `POST /api/chat` with body `{messages, locale}`, where `messages` is the stored history
plus the new user message, trimmed to the most recent 20 (the API limit), and `locale` is the active UI locale. If
the trimmed window starts with an agent message, that message SHALL be dropped so the window starts with the user.

#### Scenario: Short history
- **WHEN** the history holds 2 messages and the user sends a third in locale `en`
- **THEN** the request body has those 3 messages in order and `"locale": "en"`

#### Scenario: Long history is trimmed
- **WHEN** the history holds 24 messages (alternating user and agent, starting with user) and the user sends one more
- **THEN** the request carries at most 20 messages
- **AND** they are the most recent ones, starting with a `user` message and ending with the new one

#### Scenario: Full history stays on screen
- **WHEN** a request was trimmed to 20 messages
- **THEN** the feed still shows every stored message

### Requirement: Pending turn is visible and announced
While a turn is pending, the feed SHALL show the user's message and a typing indicator whose text is exposed to
assistive technology, inside the polite live region.

#### Scenario: Waiting for the reply
- **WHEN** the user sends a message and the API has not answered yet
- **THEN** the feed shows the message as a user bubble
- **AND** a typing indicator with a localized accessible label is present in the live region

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
- **AND** a product card for the GD20 appears under it and the side trace panel shows the `search_products` call

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

### Requirement: Localized error states
A failed turn SHALL show a localized alert (`role="alert"`) chosen from the API error code: `invalid_request` (422),
`rate_limited` (429, stating the `Retry-After` seconds when the header is a positive integer), `model_unavailable`
(503). Any other status, `internal_error` (500), a network failure or a malformed body SHALL show a generic message.
No raw status text or response body is shown.

#### Scenario: Rate limited
- **WHEN** the API answers 429 with `{"error": "rate_limited"}` and `Retry-After: 30`
- **THEN** the alert says, in the active locale, to try again in 30 seconds

#### Scenario: Rate limited without a usable header
- **WHEN** the API answers 429 without a `Retry-After` header
- **THEN** the alert says to try again shortly, without a number

#### Scenario: Model unavailable
- **WHEN** the API answers 503 with `{"error": "model_unavailable"}`
- **THEN** the alert says the assistant is unavailable right now and to try again

#### Scenario: Invalid request
- **WHEN** the API answers 422 with `{"error": "invalid_request"}`
- **THEN** the alert says the message could not be sent and suggests starting a new conversation

#### Scenario: Internal error or network failure
- **WHEN** the API answers 500, or the request fails before any response
- **THEN** the alert shows the generic error message

#### Scenario: Alert clears on the next send
- **WHEN** an alert is shown and the user sends a new message
- **THEN** the alert is removed

### Requirement: Failed turn keeps the history consistent
After a failed turn the history SHALL be unchanged, the pending user bubble SHALL be removed, and its text SHALL be
put back into the composer so the user can resend it.

#### Scenario: Retry after an error
- **WHEN** the user sends "Oi" and the API answers 503
- **THEN** the stored history has no "Oi" message
- **AND** the composer contains "Oi"

### Requirement: Conversation survives a reload
The history SHALL be saved in the browser's local storage after every successful turn and restored when the page
loads, including each agent reply's cards and trace. Requests SHALL send only each message's `role` and `text`.
Stored data that is missing, unreadable or of the wrong shape SHALL be treated as an empty conversation; stored
messages saved before cards existed SHALL load as messages without cards or trace.

#### Scenario: Reload
- **WHEN** a user completes a turn that returned a product card and reloads the page
- **THEN** the feed shows the same user and agent messages in the same order, with the same card
- **AND** the trace panel shows the same latest trace

#### Scenario: Corrupted storage
- **WHEN** the stored value is not valid JSON or has the wrong shape
- **THEN** the page shows the greeting and no error

#### Scenario: History saved before cards
- **WHEN** storage holds messages with only `role` and `text`
- **THEN** they are shown as before, without cards, and the trace panel shows its empty state

#### Scenario: Request strips cards and trace
- **WHEN** the history holds an agent message with cards and trace and the user sends a new message
- **THEN** every message in the request body has only `role` and `text`

### Requirement: New conversation
The header SHALL offer a labelled "new conversation" button that clears the history from the screen and from
storage, removes any alert, shows the greeting again and moves focus to the composer.

#### Scenario: Starting over
- **WHEN** a conversation has messages and the user activates "new conversation"
- **THEN** the feed shows only the greeting and suggestions
- **AND** reloading the page still shows no messages
- **AND** focus is on the composer text field

### Requirement: Keyboard-only use
Every control (language toggle, new conversation, trace button on narrow screens, suggestions, text field, send
button) SHALL be reachable with Tab, operable from the keyboard and show a visible focus indicator. Icon-only
buttons SHALL have an accessible name.

#### Scenario: Tab order
- **WHEN** a keyboard user tabs from the top of the page
- **THEN** focus reaches the language toggle, the new conversation button, the suggestions, the text field and the send button in that order

#### Scenario: Narrow screen labels
- **WHEN** the viewport is 360 px wide and buttons show only icons
- **THEN** the trace, new conversation and send buttons still expose their localized names
