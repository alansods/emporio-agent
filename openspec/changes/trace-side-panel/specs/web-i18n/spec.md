## MODIFIED Requirements

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
