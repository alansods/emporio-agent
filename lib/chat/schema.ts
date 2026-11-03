import { z } from "zod";

import { MAX_MESSAGE_CHARS } from "./limits";

/** Mirrors of the Pydantic models in `emporio_agent/api_models.py`. */
export const LOCALES = ["en", "pt-BR"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const messageSchema = z.object({
  role: z.enum(["user", "agent"]),
  text: z.string().min(1).max(MAX_MESSAGE_CHARS),
});
export type ChatMessage = z.infer<typeof messageSchema>;

export type ChatRequest = { messages: ChatMessage[]; locale: Locale };

const promotionSchema = z.object({ name: z.string(), discount_percent: z.number() });
const installmentsSchema = z.object({ count: z.number().int(), amount: z.number() });

export const productCardSchema = z.object({
  type: z.literal("product"),
  product_id: z.number().int(),
  name: z.string(),
  category: z.string(),
  availability: z.enum(["available", "out_of_stock", "discontinued", "coming_soon"]),
  stock: z.number().int(),
  list_price: z.number(),
  promotion: promotionSchema.nullable(),
  effective_price: z.number(),
  pix_price: z.number().nullable(),
  installments: installmentsSchema,
});
export type ProductCard = z.infer<typeof productCardSchema>;

const returnWindowSchema = z.object({
  kind: z.enum(["regret", "preference_exchange", "defect_exchange", "legal_warranty"]),
  deadline: z.iso.date(),
  open: z.boolean(),
});

export const orderCardSchema = z.object({
  type: z.literal("order"),
  order_id: z.number().int(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
  order_date: z.iso.date(),
  estimated_delivery: z.iso.date().nullable(),
  tracking_code: z.string().nullable(),
  total: z.number(),
  payment_method: z.enum(["pix", "boleto", "debit", "credit_3x", "credit_6x", "credit_12x"]),
  items: z.array(z.object({ product_name: z.string(), quantity: z.number().int() })),
  return_windows: z.array(returnWindowSchema),
});
export type OrderCard = z.infer<typeof orderCardSchema>;

export const cardSchema = z.discriminatedUnion("type", [productCardSchema, orderCardSchema]);
export type Card = z.infer<typeof cardSchema>;

const outcomeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("products"), count: z.number().int() }),
  z.object({ kind: z.literal("order") }),
  z.object({ kind: z.literal("error"), code: z.string() }),
]);
export type TraceOutcome = z.infer<typeof outcomeSchema>;

export const traceSchema = z.object({
  model_calls: z.number().int(),
  duration_ms: z.number().int(),
  steps: z.array(
    z.object({
      tool: z.string(),
      arguments: z.record(z.string(), z.unknown()),
      outcome: outcomeSchema,
      duration_ms: z.number().int(),
    }),
  ),
});
export type Trace = z.infer<typeof traceSchema>;

/** Not strict: fields added later must not break this client. */
export const chatResponseSchema = z.object({
  reply: z.string(),
  cards: z.array(cardSchema).default([]),
  trace: traceSchema.optional(),
});
export type ChatTurn = z.infer<typeof chatResponseSchema>;

export const apiErrorSchema = z.object({ error: z.string() });
