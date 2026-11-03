## REMOVED Requirements

### Requirement: Trace panel
**Reason**: The collapsed disclosure under each reply is replaced by one always-open side panel for the latest
turn, so its "Collapsed by default" and "Keyboard toggle" scenarios no longer apply.
**Migration**: See "Trace side panel" and "Trace sheet on narrow screens" below; the label, error and no-tools
scenarios move there.

## ADDED Requirements

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
