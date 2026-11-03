# product-catalog Specification

## Purpose
Lets the agent query the store catalog with combinable filters and get each product's live price, stock and
availability, so it never answers those from memory.

## Requirements

### Requirement: Combinable optional filters
The product search SHALL accept these optional filters and combine every one given with AND: product name text,
category, minimum price, maximum price, and an "only available" flag. With no filters it SHALL search the whole
catalog.

#### Scenario: Category, budget and availability together
- **WHEN** the search runs with category "Violões", maximum price 1000 and only available set
- **THEN** every result is in "Violões", has an effective price of at most 1000 and is `available`
- **AND** "Giannini GF-3D Dreadnought Sunburst" (stock 0) is not in the results

#### Scenario: No filters
- **WHEN** the search runs with no filters
- **THEN** the total count equals the number of products in the catalog (65)

### Requirement: Accent and case insensitive name search
Name search SHALL ignore case, accents and surrounding whitespace, split the text into words, and match a product
only when every word appears in the product name.

#### Scenario: Exact model
- **WHEN** the search runs with name "takamine gd20"
- **THEN** the only result is "Takamine GD20 Dreadnought Natural"

#### Scenario: Accents ignored
- **WHEN** the search runs with name "eletrico nylon takamine"
- **THEN** the results include "Takamine GC5CE Elétrico Nylon Natural"

#### Scenario: Every word must match
- **WHEN** the search runs with name "takamine martin"
- **THEN** the total count is 0

### Requirement: Category restricted to the catalog's categories
The category filter SHALL accept only the 9 category names from `categories.csv`, compared ignoring case and
accents, and SHALL return an error result naming the valid categories for any other value.

#### Scenario: Accent-insensitive category
- **WHEN** the search runs with category "violoes"
- **THEN** every result is in the category "Violões"

#### Scenario: Unknown category
- **WHEN** the search runs with category "Cordas de aço"
- **THEN** the result is an error that lists the 9 valid category names

### Requirement: Price filters and ordering use the effective price
Price filters SHALL compare against the effective price (after an active promotion), and results SHALL be sorted
by effective price, lowest first.

#### Scenario: Promotion brings a product into budget
- **WHEN** the search runs with name "Taylor 110e" and maximum price 5600
- **THEN** "Taylor 110e Dreadnought Natural" (list 5999, effective 5519.08) is in the results

#### Scenario: Sorted by effective price
- **WHEN** the search runs with category "Violões"
- **THEN** each result's effective price is less than or equal to the next one's

### Requirement: Result cap with total count
The search SHALL return at most 8 products and SHALL always report the total number of matches before the cap.

#### Scenario: More matches than the cap
- **WHEN** the search runs with category "Violões" (35 products)
- **THEN** 8 products are returned
- **AND** the total count is 35

### Requirement: Availability status
Each product result SHALL carry exactly one availability value: `available` (status active and stock above 0),
`out_of_stock` (status active and stock 0), `discontinued`, or `coming_soon`, plus its stock quantity, category
name, description and specs.

#### Scenario: Out of stock
- **WHEN** the search returns "Giannini GF-3D Dreadnought Sunburst"
- **THEN** its availability is `out_of_stock`

#### Scenario: Discontinued
- **WHEN** the search returns "Shelby SN-7C 7 Cordas Nylon Natural"
- **THEN** its availability is `discontinued`

#### Scenario: Coming soon
- **WHEN** the search returns "Kala KA-ABP-CTG Barítono Cedar"
- **THEN** its availability is `coming_soon`

#### Scenario: Only available hides the rest
- **WHEN** the search runs with only available set and no other filter
- **THEN** no result has availability `out_of_stock`, `discontinued` or `coming_soon`

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
