import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { OrderCard as OrderCardData } from "@/lib/chat/schema";

import styles from "./Cards.module.css";

/** Every value comes from the verified tool result; this component only labels and formats it. */
export function OrderCard({ card }: { card: OrderCardData }) {
  const { locale, t } = useI18n();
  const date = (iso: string) => formatDate(locale, iso);

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{t("cards.order", { id: card.order_id })}</h3>
      <dl className={styles.facts}>
        <dt>{t("cards.status")}</dt>
        <dd>{t(`orderStatus.${card.status}`)}</dd>
        <dt>{t("cards.orderDate")}</dt>
        <dd>{date(card.order_date)}</dd>
        {card.estimated_delivery && (
          <>
            <dt>{t("cards.estimatedDelivery")}</dt>
            <dd>{date(card.estimated_delivery)}</dd>
          </>
        )}
        {card.tracking_code && (
          <>
            <dt>{t("cards.tracking")}</dt>
            <dd>{card.tracking_code}</dd>
          </>
        )}
        <dt>{t("cards.total")}</dt>
        <dd>{formatCurrency(locale, card.total)}</dd>
        <dt>{t("cards.payment")}</dt>
        <dd>{t(`payment.${card.payment_method}`)}</dd>
        <dt>{t("cards.items")}</dt>
        <dd>
          <ul className={styles.plainList}>
            {card.items.map((item, index) => (
              <li key={index}>
                {t("cards.itemQuantity", { quantity: item.quantity, name: item.product_name })}
              </li>
            ))}
          </ul>
        </dd>
        {card.return_windows.length > 0 && (
          <>
            <dt>{t("cards.returnWindows")}</dt>
            <dd>
              <ul className={styles.plainList}>
                {card.return_windows.map((window) => (
                  <li key={window.kind}>
                    {t(`returnWindow.${window.kind}`)}{" "}
                    {t("cards.windowDeadline", { date: date(window.deadline) })} ·{" "}
                    <span className={window.open ? styles.open : styles.closed}>
                      {t(window.open ? "cards.windowOpen" : "cards.windowClosed")}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}
