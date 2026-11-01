from emporio_agent.catalog import search_products

VIOLOES = "Violões"
CATEGORY_NAMES = {
    "Guitarras",
    "Baixos",
    "Baterias e Percussão",
    "Teclados e Pianos",
    "Violões",
    "Instrumentos de Sopro (Madeiras)",
    "Instrumentos de Sopro (Metais)",
    "Cordas Orquestrais",
    "Ukuleles",
}


def names(result: dict) -> list[str]:
    return [product["name"] for product in result["products"]]


def find(name: str) -> dict:
    result = search_products(name=name)
    return next(product for product in result["products"] if product["name"] == name)


def test_category_budget_and_availability_combine():
    result = search_products(category=VIOLOES, max_price=1000, only_available=True)

    assert result["total_found"] > 0
    for product in result["products"]:
        assert product["category"] == VIOLOES
        assert product["effective_price"] <= 1000
        assert product["availability"] == "available"
    assert "Giannini GF-3D Dreadnought Sunburst" not in names(result)


def test_no_filters_searches_whole_catalog():
    assert search_products()["total_found"] == 65


def test_exact_model_name():
    result = search_products(name="takamine gd20")

    assert names(result) == ["Takamine GD20 Dreadnought Natural"]


def test_name_search_ignores_accents():
    result = search_products(name="eletrico nylon takamine")

    assert "Takamine GC5CE Elétrico Nylon Natural" in names(result)


def test_every_word_must_match():
    assert search_products(name="takamine martin")["total_found"] == 0


def test_category_ignores_accents_and_case():
    result = search_products(category="violoes")

    assert result["total_found"] == 35
    assert {product["category"] for product in result["products"]} == {VIOLOES}


def test_unknown_category_lists_valid_ones():
    result = search_products(category="Cordas de aço")

    assert result["error"] == "invalid_category"
    assert set(result["valid_categories"]) == CATEGORY_NAMES


def test_promotion_brings_product_into_budget():
    result = search_products(name="Taylor 110e", max_price=5600)

    assert "Taylor 110e Dreadnought Natural" in names(result)


def test_min_price_uses_effective_price():
    result = search_products(name="Taylor 110e", min_price=5600)

    assert "Taylor 110e Dreadnought Natural" not in names(result)


def test_sorted_by_effective_price():
    prices = [product["effective_price"] for product in search_products()["products"]]

    assert prices == sorted(prices)


def test_results_are_capped_with_total_count():
    result = search_products(category=VIOLOES)

    assert len(result["products"]) == 8
    assert result["total_found"] == 35


def test_product_result_shape():
    product = find("Taylor 110e Dreadnought Natural")

    assert product["category"] == VIOLOES
    assert product["stock"] == 4
    assert product["description"]
    assert product["specs"]["top"]
    assert product["list_price"] == 5999.0
    assert product["promotion"] == {"name": "Desconto Exclusivo", "discount_percent": 8}
    assert product["effective_price"] == 5519.08
    assert product["pix_price"] is None
    assert product["pix_discount_applies"] is False
    assert product["installments"] == {"count": 12, "amount": 459.92}


def test_out_of_stock():
    assert find("Giannini GF-3D Dreadnought Sunburst")["availability"] == "out_of_stock"


def test_discontinued():
    assert find("Shelby SN-7C 7 Cordas Nylon Natural")["availability"] == "discontinued"


def test_coming_soon():
    assert find("Kala KA-ABP-CTG Barítono Cedar")["availability"] == "coming_soon"


def test_only_available_hides_the_rest():
    result = search_products(only_available=True)

    assert result["total_found"] == 61
    assert all(product["availability"] == "available" for product in result["products"])
