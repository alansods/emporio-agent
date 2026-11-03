# pricing Specification

## Purpose
Computes every number the agent quotes about a product (effective price, promotion, PIX price, interest-free
installments) deterministically from the data and the policy manual, so the model never does arithmetic.

## Requirements

### Requirement: Only active promotions count, highest discount wins
A product's promotion SHALL be chosen only among its promotions with `is_active = 1`. When more than one is
active, the one with the highest discount percent SHALL apply. Inactive promotions SHALL never appear in results.

#### Scenario: Inactive promotion ignored
- **WHEN** pricing runs for "Crafter CE-15 Elétrico Nylon Natural" (product 102, only an inactive 10% promotion)
- **THEN** the result has no promotion and its effective price equals the list price 3899.00

#### Scenario: Active promotion applied
- **WHEN** pricing runs for "Taylor 110e Dreadnought Natural" (list 5999, active "Desconto Exclusivo" 8%)
- **THEN** the result shows list price 5999.00, discount 8%, promotion "Desconto Exclusivo" and effective price
  5519.08

#### Scenario: Several active promotions
- **WHEN** a product has active promotions of 10% and 20%
- **THEN** the 20% promotion is the one applied

### Requirement: Promotional price rounding
The promotional price SHALL be the list price minus the discount percent, rounded to cents with half-up rounding.

#### Scenario: Rounded to cents
- **WHEN** pricing runs for "Kalani KAL-700T Tenor Natural" (list 359, active 10%)
- **THEN** the effective price is 323.10

### Requirement: PIX discount only without promotion
The PIX price SHALL be the list price minus 5%, rounded to cents half-up, and SHALL be present only when no
promotion applies. When a promotion applies, the result SHALL state that the PIX discount does not apply.

#### Scenario: PIX price without promotion
- **WHEN** pricing runs for "Takamine GD20 Dreadnought Natural" (list 2199, no active promotion)
- **THEN** the PIX price is 2089.05

#### Scenario: No PIX discount on a promotional price
- **WHEN** pricing runs for "Taylor 110e Dreadnought Natural"
- **THEN** the result has no PIX price
- **AND** the result marks the PIX discount as not applicable because of the promotion

### Requirement: Maximum interest-free installments
The result SHALL give the largest installment count from 1 to 12 allowed for the effective price, and the
installment amount rounded to cents half-up. 1x is always allowed; 2x and 3x need installments of at least
R$ 50; 4x to 6x at least R$ 80; 7x to 12x at least R$ 100.

#### Scenario: Twelve installments
- **WHEN** the effective price is 2199.00
- **THEN** the maximum is 12 installments of 183.25

#### Scenario: Limited by the 4x to 6x minimum
- **WHEN** the effective price is 429.90
- **THEN** the maximum is 5 installments of 85.98

#### Scenario: Promotional price drives the count
- **WHEN** the effective price is 323.10 (Kalani KAL-700T after promotion)
- **THEN** the maximum is 4 installments of 80.78

#### Scenario: Exactly at the 3x minimum
- **WHEN** the effective price is 150.00
- **THEN** the maximum is 3 installments of 50.00

#### Scenario: Below the 2x minimum
- **WHEN** the effective price is 90.00
- **THEN** the maximum is 1 installment of 90.00
