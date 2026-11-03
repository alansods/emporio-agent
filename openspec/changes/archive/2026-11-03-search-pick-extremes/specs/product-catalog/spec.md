## ADDED Requirements

### Requirement: Pick the cheapest or most expensive
The product search SHALL accept an optional `pick` (`cheapest` or `most_expensive`). After every other filter, it
SHALL return only the matches at the lowest or highest effective price, every one of them on a tie, with the total
count of those products. Without `pick` results SHALL be unchanged; other values SHALL return an error.

#### Scenario: Cheapest in a category
- **WHEN** the search runs with category "Guitarras" and pick `cheapest`
- **THEN** the only result is "Fender Telecaster Player Series" (effective price 5400)
- **AND** the total count is 1

#### Scenario: Most expensive in a category
- **WHEN** the search runs with category "Guitarras" and pick `most_expensive`
- **THEN** the only result is "Gibson Les Paul Standard '50s" (effective price 18900)

#### Scenario: Ties return every tied product
- **WHEN** the search runs with category "Violões", minimum price 1299 and pick `cheapest`
- **THEN** the results are exactly "Yamaha FG800 Dreadnought Natural" and "Rozini RV-174 7 Cordas Nylon Natural"
  (both 1299)
- **AND** the total count is 2

#### Scenario: Pick applies after the other filters
- **WHEN** the search runs with category "Violões", minimum price 749, only available set and pick `cheapest`
- **THEN** the only result is "Tagima Dallas Tuner Aço Natural"
- **AND** "Shelby SN-7C 7 Cordas Nylon Natural" (also 749, discontinued) is not in the results

#### Scenario: No matches
- **WHEN** the search runs with name "takamine martin" and pick `cheapest`
- **THEN** the total count is 0 and no product is returned

#### Scenario: Unknown pick value
- **WHEN** the search runs with pick `best`
- **THEN** the result is an error that lists `cheapest` and `most_expensive`
