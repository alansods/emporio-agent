# Design

## Context

`search_products` (`emporio_agent/catalog.py`) filters, prices, sorts by effective price and returns at most 8
products plus `total_found`. `cards.py` turns every returned product into a card. The model already gets results
sorted, so it names the right product, but the cards cannot know the question asked for one.

## Goals / Non-Goals

**Goals:**
- Cheapest or most expensive questions return only the extreme products, ties included, so cards match the reply.

**Non-Goals:**
- Changing the card builder, the result cap or the default ordering.

## Decisions

### D1. Select the extremes in the tool, not in the model's text

`pick` is applied in Python after the price-range filter: take the minimum or maximum effective price of the
matches and keep every product with exactly that price (`Decimal` equality). Reasons:
- Exact ties: "every product at the lowest price" is a set comparison the code gets right every time; the model
  could drop a tied product.
- Cards match the reply: cards come from the tool result, so they shrink with it without touching `cards.py`.
- Testable: ties and filter combinations are unit tests on real catalog data, not a manual model run.

Alternatives: a `limit` argument (`limit: 1` hides ties and picks one arbitrarily); filtering cards by product names
found in the reply (fragile string matching that ties cards to the model's prose); collapsing extra cards in the UI
(keeps the noise, only hides it).

### D2. Argument shape

One string enum `pick` (`cheapest`, `most_expensive`) instead of two booleans, so the two cannot be set together.
It is declared with `enum` in the tool schema; `search_products` still checks the value and returns
`{"error": "invalid_pick", ...}` with the valid values, the same pattern as `invalid_category`, because the model can
send values outside the schema. `total_found` reports the size of the picked set, so the model never says "1 of 5"
about a pick. The 8-product cap still applies (no tie in the catalog is that large).

### D3. Prompt rule and spec placement

One line in the search section of the prompt: for "mais barato"/"mais caro" questions pass `pick` with the other
filters the question gives. It goes in a new `support-agent` requirement instead of modifying "System prompt
content", because `readme-and-limitations` already has a pending delta on that requirement and two MODIFIED deltas
on one requirement would overwrite each other at archive.

### D4. Behavior case

The new case "Qual a guitarra mais barata?" expects `search_products` with `category` "Guitarras" and `pick`
"cheapest"; other arguments are ignored, as in the other cases. `test_cases_and_conversations_cover_the_brief`
moves from 8 to 9 cases. The script is not run in this change; the single run happens in `readme-and-limitations`.

## Risks / Trade-offs

- [The model does not pass `pick`] → The turn falls back to today's behavior (right reply, extra cards). The new
  behavior case catches it in the manual run.
- [Cheapest product is discontinued or out of stock, e.g. the cheapest bass is a discontinued model] → `pick`
  follows the filters; the prompt's existing rule already asks for `only_available` when the customer asks for
  what can be bought now. Not changed here.
