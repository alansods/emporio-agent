## MODIFIED Requirements

### Requirement: System prompt content
Every model request SHALL carry a system prompt with the store persona, the rule to answer price, stock and
promotion only from a tool result in the same turn, the scope rules for accessories and unrelated topics, the
contact phone and email, the reference date, and the full policy manual text. It SHALL also instruct the model to
quote tool values exactly as returned, to format replies only with paragraphs, `**bold**` and `- ` bullet lists, to
pass every search filter the question allows, to ask for the order owner's full name or email before calling
`get_order_status`, and to cite the return windows still open when the one the customer asked about is closed.

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
