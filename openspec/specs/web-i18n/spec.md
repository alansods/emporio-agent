# web-i18n Specification

## Purpose
Localization of the web UI in English (`en`) and Brazilian Portuguese (`pt-BR`): dictionaries with identical keys,
locale detection, persistence and switching, server-rendered locale, and locale-aware plurals.

## Requirements

### Requirement: Dictionaries have the same keys
The `en` and `pt-BR` dictionaries SHALL define exactly the same keys, every value SHALL be a non-empty string, and
the placeholders (`{name}`) in a value SHALL be the same in both languages.

#### Scenario: Key parity
- **WHEN** the test suite runs
- **THEN** it fails if a key exists in one dictionary and not in the other

#### Scenario: Placeholder parity
- **WHEN** the test suite runs
- **THEN** it fails if a value in one dictionary uses a placeholder the other language's value does not

#### Scenario: No empty values
- **WHEN** the test suite runs
- **THEN** it fails if any dictionary value is empty or only whitespace

### Requirement: Every UI string comes from the active dictionary
Every user-visible string and accessible name in the UI SHALL come from the active locale's dictionary, except the
brand name "Empório da Música" and the language toggle's own labels (EN, PT-BR). Agent replies are not translated
by the client.

#### Scenario: Switching to English
- **WHEN** the page is in `pt-BR` and the user switches to `en`
- **THEN** no `pt-BR` dictionary value is still displayed or used as an accessible name
- **AND** the greeting, suggestions, composer placeholder and label, send and new conversation names are in English

#### Scenario: Switching to Portuguese
- **WHEN** the page is in `en` and the user switches to `pt-BR`
- **THEN** no `en` dictionary value is still displayed or used as an accessible name

#### Scenario: Existing replies stay as written
- **WHEN** the feed holds an agent reply in Portuguese and the user switches to `en`
- **THEN** the reply text is unchanged

### Requirement: Language toggle
The header SHALL show a labelled group with two buttons, EN and PT-BR, where the active one has
`aria-pressed="true"`. Choosing one SHALL switch the UI immediately without a page reload and set `<html lang>` to
the new locale. The group SHALL be drawn as a pill: the active option filled with the brand pink and dark text, the
inactive one with muted text on the surface, with text contrast of at least 4.5:1 in both states.

#### Scenario: Toggle state
- **WHEN** the page is in `pt-BR`
- **THEN** the PT-BR button has `aria-pressed="true"` and the EN button `aria-pressed="false"`

#### Scenario: Switching updates the document language
- **WHEN** the user activates EN
- **THEN** the document's `lang` attribute is `en`

#### Scenario: Active option contrast
- **WHEN** the test suite checks the toggle's token pairs
- **THEN** the active text on pink and the inactive text on the surface each reach at least 4.5:1

### Requirement: Chat requests use the active locale
Each chat request SHALL carry the UI locale active when it is sent, so the agent replies in the language the user
sees.

#### Scenario: Locale switch before sending
- **WHEN** the user switches to `en` and then sends a message
- **THEN** the request body has `"locale": "en"`

### Requirement: Locale is remembered and detected
A chosen locale SHALL be saved in local storage and in a cookie. On load, a saved locale wins; otherwise the
browser language decides: any `pt` language selects `pt-BR`, anything else selects `en`.

#### Scenario: Remembered choice
- **WHEN** the user chose `en` and reloads the page
- **THEN** the page is in `en` even if the browser language is Portuguese

#### Scenario: First visit with a Portuguese browser
- **WHEN** no locale is saved and the browser language is `pt-PT`
- **THEN** the page switches to `pt-BR`

#### Scenario: First visit with another browser language
- **WHEN** no locale is saved and the browser language is `es-ES`
- **THEN** the page is in `en`

#### Scenario: Unknown saved value
- **WHEN** the saved locale is `fr`
- **THEN** it is ignored and the browser language decides

### Requirement: Server renders the saved locale
When the request carries a saved locale cookie, the server-rendered HTML SHALL already use that locale for its UI
strings and its `<html lang>`, so returning users see no flash of the other language.

#### Scenario: Returning Portuguese user
- **WHEN** the home page is requested with the locale cookie set to `pt-BR`
- **THEN** the HTML response has `lang="pt-BR"` and the Portuguese greeting

#### Scenario: No cookie
- **WHEN** the home page is requested without the locale cookie
- **THEN** the HTML response has `lang="en"`

### Requirement: Plurals follow the locale
Strings that depend on a count SHALL pick their plural form with the active locale's plural rules.

#### Scenario: One second
- **WHEN** a 429 response has `Retry-After: 1`
- **THEN** the alert uses the singular form ("1 second" in `en`, "1 segundo" in `pt-BR`)

#### Scenario: Several seconds
- **WHEN** a 429 response has `Retry-After: 30`
- **THEN** the alert uses the plural form ("30 seconds" in `en`, "30 segundos" in `pt-BR`)
