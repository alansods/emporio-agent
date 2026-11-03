import type { Card } from "@/lib/chat/schema";

import styles from "./Cards.module.css";
import { OrderCard } from "./OrderCard";
import { ProductCard } from "./ProductCard";

/** The API sends product cards before order cards; they are shown in the order received. */
export function AnswerCards({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return null;
  return (
    <div className={styles.list}>
      {cards.map((card) =>
        card.type === "product" ? (
          <ProductCard key={`product-${card.product_id}`} card={card} />
        ) : (
          <OrderCard key={`order-${card.order_id}`} card={card} />
        ),
      )}
    </div>
  );
}
