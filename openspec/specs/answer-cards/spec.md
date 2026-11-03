# answer-cards Specification

## Purpose
Structured product and order cards built from a turn's tool results, returned by the chat API and shown under the
agent reply, so tool-backed facts are readable without trusting model prose.

## Requirements

### Requirement: Cards come only from tool results
The chat response SHALL include `cards`, a list built from the turn's tool results only, never from the model's
text. A turn with no successful tool result SHALL return an empty list. Card values SHALL be the values the tool
computed; no price, discount, installment or deadline is recalculated outside the tools.

#### Scenario: No tools used
- **WHEN** the model answers a greeting without calling a tool
- **THEN** `cards` is `[]`

#### Scenario: Values match the tool result
- **WHEN** `search_products` returns the Takamine GD20 with list price 2199, PIX price 2089.05 and 12 installments of 183.25
- **THEN** its product card carries exactly 2199, 2089.05, 12 and 183.25

#### Scenario: Tool error gives no card
- **WHEN** a `search_products` call returns `invalid_category`
- **THEN** no card is built from that call

### Requirement: Product cards
Each product returned by a successful `search_products` call in the turn SHALL produce one card of type `product`
with product id, name, category, availability, stock, list price, active promotion (name and discount percent) or
none, effective price, PIX price or none, and maximum interest-free installments (count and amount). Products SHALL
appear once per turn in the order they were first returned, at most 8 product cards per turn.

#### Scenario: Two searches return the same product
- **WHEN** two `search_products` calls in one turn both return product 81
- **THEN** `cards` holds one product card for product 81

#### Scenario: Cap
- **WHEN** the turn's searches return 11 distinct products
- **THEN** `cards` holds the first 8 of them

#### Scenario: Promotion without PIX
- **WHEN** a returned product has an active promotion
- **THEN** its card has the promotion and the promotional effective price, and its PIX price is `null`

### Requirement: Order cards
Each successful `get_order_status` result SHALL produce one card of type `order` with order id, status, order date,
estimated delivery or none, tracking code or none, total, payment method, items (product name and quantity) and
return windows (kind, deadline, open). A `order_not_verified` result SHALL produce no card, so a failed identity
check reveals nothing through cards either.

#### Scenario: Verified order
- **WHEN** `get_order_status` returns order 1 for its owner
- **THEN** `cards` holds an order card for 1 with its items and return windows

#### Scenario: Wrong identity
- **WHEN** `get_order_status` returns `order_not_verified`
- **THEN** `cards` holds no order card and contains no data of that order

### Requirement: Cards are shown under the reply
The UI SHALL render the cards of a turn under that turn's agent bubble, product cards before order cards in the
order received. All labels SHALL come from the active dictionary; money SHALL be formatted with the active locale in
BRL and dates with the active locale. Data values (product names, categories, item names) SHALL be shown as
received. Cards SHALL be plain content (not focusable controls) and SHALL fit a 360 px viewport without horizontal
scroll.

#### Scenario: Product card in Portuguese
- **WHEN** the locale is `pt-BR` and a product card has list price 2199, PIX price 2089.05 and 12 x 183.25
- **THEN** the card shows "R$ 2.199,00", "R$ 2.089,05" and "12x" with "R$ 183,25"

#### Scenario: Product card in English
- **WHEN** the locale is `en` and the same card is shown
- **THEN** its labels are English and the amounts use the English BRL format

#### Scenario: Promotion shown
- **WHEN** a product card has a promotion of 10% and an effective price below the list price
- **THEN** the card shows the list price as the old price, the effective price, and the 10% discount

#### Scenario: Availability label
- **WHEN** a product card has availability `out_of_stock`
- **THEN** the card shows the localized out-of-stock label, not the raw value

#### Scenario: Order card
- **WHEN** an order card has status `delivered`, payment method `credit_6x` and an open `regret` window
- **THEN** the card shows the localized status, payment method and window name, the formatted deadline and an open label

#### Scenario: Switching language re-labels cards
- **WHEN** cards are on screen and the user switches the language
- **THEN** every card label and formatted amount changes to the new locale
