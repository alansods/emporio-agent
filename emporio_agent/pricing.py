"""Price rules from the policy manual (sections 3.1 and 6.2). The model never does this math."""

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from emporio_agent.data import Product, Promotion

CENT = Decimal("0.01")
HUNDRED = Decimal("100")
PIX_DISCOUNT_PERCENT = Decimal("5")
MAX_INSTALLMENTS = 12

# (installment counts, minimum installment amount in BRL), from manual section 3.1.
INSTALLMENT_MINIMUMS: tuple[tuple[range, Decimal], ...] = (
    (range(2, 4), Decimal("50")),
    (range(4, 7), Decimal("80")),
    (range(7, MAX_INSTALLMENTS + 1), Decimal("100")),
)


@dataclass(frozen=True)
class Installments:
    count: int
    amount: Decimal


@dataclass(frozen=True)
class Pricing:
    list_price: Decimal
    promotion: Promotion | None
    effective_price: Decimal
    pix_price: Decimal | None
    installments: Installments

    @property
    def pix_discount_applies(self) -> bool:
        return self.pix_price is not None


def to_cents(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def discounted(price: Decimal, percent: Decimal) -> Decimal:
    return to_cents(price * (HUNDRED - percent) / HUNDRED)


def active_promotion(promotions: Iterable[Promotion]) -> Promotion | None:
    """Only active promotions count; promotions do not stack, so the highest discount wins."""
    active = [promo for promo in promotions if promo.is_active]
    return max(active, key=lambda promo: promo.discount_percent, default=None)


def _minimum_installment(count: int) -> Decimal:
    return next(minimum for counts, minimum in INSTALLMENT_MINIMUMS if count in counts)


def max_installments(price: Decimal) -> Installments:
    """Largest interest-free count whose installment meets its band's minimum (1x always)."""
    allowed = [
        count
        for count in range(2, MAX_INSTALLMENTS + 1)
        if price / count >= _minimum_installment(count)
    ]
    count = max(allowed, default=1)
    return Installments(count=count, amount=to_cents(price / count))


def price_product(product: Product, promotions: Iterable[Promotion]) -> Pricing:
    list_price = to_cents(product.price)
    promotion = active_promotion(promotions)
    if promotion is None:
        effective_price = list_price
        pix_price = discounted(list_price, PIX_DISCOUNT_PERCENT)
    else:
        effective_price = discounted(list_price, promotion.discount_percent)
        pix_price = None
    return Pricing(
        list_price=list_price,
        promotion=promotion,
        effective_price=effective_price,
        pix_price=pix_price,
        installments=max_installments(effective_price),
    )
