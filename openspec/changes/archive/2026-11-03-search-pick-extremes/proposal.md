# Proposal

## Why

"Qual a guitarra mais barata?" gets the right product in the reply, but the turn shows a card for every guitar:
`search_products` returns every match and cards are built from the tool result. A question about the cheapest or
the most expensive product has one answer, or several when prices tie, and the cards should show only that.

## What Changes

- `search_products` gains an optional `pick` argument: `"cheapest"` or `"most_expensive"`. After all filters, the
  tool returns every product tied at the lowest or highest effective price. Without `pick`, results are unchanged.
  An unknown `pick` value returns an error result, like an unknown category.
- The system prompt tells the model to pass `pick` for cheapest or most expensive questions.
- `scripts/record_examples.py` gains one case: "Qual a guitarra mais barata?" must call `search_products` with
  category "Guitarras" and `pick` "cheapest".
- Cards are not changed: they still come from the tool result, so they follow `pick` on their own.

Out of scope: a result limit or pagination, other sort orders, UI changes, and re-recording `examples/` (done once
in `readme-and-limitations`). No new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `product-catalog`: new requirement for the `pick` argument.
- `support-agent`: new requirement that the prompt asks for `pick` on cheapest or most expensive questions.
- `model-evaluation`: "Behavior cases" gains the cheapest product case.

## Impact

- `emporio_agent/catalog.py`, `emporio_agent/tools.py` (declaration), `emporio_agent/prompt.py`,
  `scripts/record_examples.py`.
- Tests: `tests/test_catalog.py`, `tests/test_tools.py`, `tests/test_prompt.py`, `tests/test_record_examples.py`.
- No API, card schema or UI change.
