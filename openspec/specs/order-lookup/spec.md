# order-lookup Specification

## Purpose
Lets the agent report an order's status, items, tracking and return deadlines only to the order's owner, with every
date calculation done deterministically from the data and the reference date.

## Requirements

### Requirement: Identity check before any order data
The order lookup SHALL require an order id and a full name or email, and SHALL return order data only when the given
value matches the order owner's full name or email, compared ignoring case, accents and surrounding whitespace.

#### Scenario: Full name matches regardless of case and accents
- **WHEN** order 7 is looked up with "leticia goncalves rocha"
- **THEN** the result contains the order status `delivered` and its items

#### Scenario: Email matches regardless of case
- **WHEN** order 7 is looked up with "Leticia.Rocha@JMAIL.com"
- **THEN** the result contains the order data

#### Scenario: Partial name is rejected
- **WHEN** order 7 is looked up with "Letícia Rocha"
- **THEN** the result is the verification error and contains no order data

#### Scenario: Another customer's name is rejected
- **WHEN** order 7 is looked up with "Ana Carolina Ferreira"
- **THEN** the result is the verification error and contains no order data

### Requirement: Unknown order is indistinguishable from a failed check
The lookup SHALL return the same error for an order id that does not exist as for an identity that does not match,
so a caller cannot probe which order ids exist.

#### Scenario: Unknown order id
- **WHEN** order 9999 is looked up with any name or email
- **THEN** the result equals the result of looking up order 7 with "Ana Carolina Ferreira"

### Requirement: Order details returned to the owner
A verified lookup SHALL return the order id, customer name, order date, status, total, payment method, items with
product name and quantity, tracking code, estimated delivery date, notes and the reference date. Missing values
SHALL be returned as null.

#### Scenario: Shipped order with tracking
- **WHEN** order 8 is looked up with "Ana Carolina Ferreira"
- **THEN** the status is `shipped`, the tracking code is "BRJL5544332BR" and the estimated delivery is 2026-02-28

#### Scenario: Cancelled order with a note
- **WHEN** order 17 is looked up by its owner
- **THEN** the status is `cancelled`, the tracking code is null and the notes say the customer cancelled it

#### Scenario: Several items
- **WHEN** order 15 is looked up by its owner
- **THEN** the items list holds two products, each with quantity 1

### Requirement: Return windows for delivered orders
For a delivered order the lookup SHALL list each return window with its deadline and whether it is still open on the
reference date (open while the reference date is on or before the deadline): regret 7 days and preference exchange
7 days from delivery, defect exchange 30 days from purchase, legal warranty 90 days from delivery. Delivery date is
the estimated delivery date. Other statuses SHALL have no return windows.

#### Scenario: All short windows closed
- **WHEN** order 7 (ordered 2026-02-03, delivered 2026-02-17) is looked up by its owner with reference date
  2026-03-23
- **THEN** regret and preference exchange close on 2026-02-24 and are closed
- **AND** defect exchange closes on 2026-03-05 and is closed
- **AND** legal warranty closes on 2026-05-18 and is open

#### Scenario: Regret window still open
- **WHEN** order 7 is looked up by its owner with reference date 2026-02-24
- **THEN** the regret window is open

#### Scenario: Not delivered yet
- **WHEN** order 8 (status `shipped`) is looked up by its owner
- **THEN** the result has no return windows

### Requirement: Reference date is configurable
"Today" for every date rule SHALL be the `REFERENCE_DATE` environment variable (ISO 8601), defaulting to
2026-03-23 when it is not set.

#### Scenario: Default reference date
- **WHEN** `REFERENCE_DATE` is not set and any verified lookup runs
- **THEN** the result's reference date is 2026-03-23

#### Scenario: Overridden reference date
- **WHEN** `REFERENCE_DATE` is 2026-02-20 and any verified lookup runs
- **THEN** the result's reference date is 2026-02-20
