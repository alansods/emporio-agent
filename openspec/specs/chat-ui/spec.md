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
