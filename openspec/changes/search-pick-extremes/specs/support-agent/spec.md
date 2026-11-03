## ADDED Requirements

### Requirement: Superlative questions use pick
The system prompt SHALL instruct the model to pass `pick` to `search_products` when the customer asks for the
cheapest or the most expensive product, together with the other filters the question gives.

#### Scenario: Prompt asks for pick
- **WHEN** a turn runs
- **THEN** the system prompt instructs the model to use `pick` `cheapest` for the cheapest product and `pick`
  `most_expensive` for the most expensive one
