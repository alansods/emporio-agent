import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ProductCard as ProductCardData } from "@/lib/chat/schema";

import styles from "./Cards.module.css";

/** Every value comes from the tool result; this component only labels and formats it. */
export function ProductCard({ card }: { card: ProductCardData }) {
  const { locale, t } = useI18n();
  const money = (amount: number) => formatCurrency(locale, amount);

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{card.name}</h3>
      <p className={styles.meta}>
        {card.category} · {t(`availability.${card.availability}`)}
      </p>
      <dl className={styles.facts}>
        <dt>{t("cards.price")}</dt>
        <dd>
          {card.promotion && <s className={styles.oldPrice}>{money(card.list_price)}</s>}
          <strong>{money(card.effective_price)}</strong>
          {card.promotion && (
            <>
              <br />
              <span className={styles.badge}>
                {t("cards.discount", {
                  name: card.promotion.name,
                  percent: card.promotion.discount_percent,
                })}
              </span>
            </>
          )}
        </dd>
        {card.pix_price !== null && (
          <>
            <dt>{t("cards.pix")}</dt>
            <dd>{money(card.pix_price)}</dd>
          </>
        )}
        <dt>{t("cards.installments")}</dt>
        <dd>
          {t("cards.installmentsValue", {
            count: card.installments.count,
            amount: money(card.installments.amount),
          })}
        </dd>
        <dt>{t("cards.stock")}</dt>
        <dd>{card.stock}</dd>
      </dl>
    </article>
  );
}
