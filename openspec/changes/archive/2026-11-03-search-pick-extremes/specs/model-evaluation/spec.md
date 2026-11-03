## MODIFIED Requirements

### Requirement: Behavior cases
The check SHALL run about nine single-turn cases covering: a product price in Portuguese and one in English
(`search_products` by name), acoustic guitars up to a price (category and price filters), the cheapest electric
guitar (category filter and pick `cheapest`), an order with the owner's full name (`get_order_status`), an order
with a wrong name (outcome `order_not_verified`), an order without name or email, an accessory request and an
off-topic request (no tool call for the last three).

#### Scenario: Report and exit status
- **WHEN** a run ends
- **THEN** it prints one pass or fail line per case and per example turn with the trace steps of failures
- **AND** it exits with status 0 only when every case and every example turn passed

#### Scenario: Cheapest product case
- **WHEN** the case "Qual a guitarra mais barata?" runs
- **THEN** it passes only if the turn calls `search_products` with category "Guitarras" and pick `cheapest`
