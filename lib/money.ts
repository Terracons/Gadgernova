import {
  flatShippingFeeKobo,
  freeShippingThresholdKobo,
  store,
} from "@/store.config";

/**
 * Money helpers.
 *
 * Everything internal is kobo (integer minor units). Naira only appears at the
 * edges: what an admin types in, and what a customer reads.
 */

/**
 * "415,000.50" or "₦415000" → 41500050. Throws on anything that isn't a number.
 *
 * Validation is strict on purpose. A lenient parser that turns a typo into 0
 * would silently publish a product priced at ₦0.00 — the admin sees "saved"
 * and finds out when someone buys a laptop for nothing.
 */
export function toKobo(value: string | number): number {
  if (value === "" || value === null || value === undefined) return 0;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Invalid amount: ${value}`);
    return Math.round(value * 100);
  }

  // Strip only formatting: currency symbol, thousands separators, whitespace.
  const cleaned = value.trim().replace(/[₦$£€,\s]/g, "");

  // Whatever remains must be a complete number — "abc" and "12abc" both fail.
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Invalid amount: ${value}`);
  }

  // Round rather than truncate so float representation can't lose a kobo.
  return Math.round(Number(cleaned) * 100);
}

/** 41500000 → 415000 (naira, for prefilling admin forms). */
export function toNaira(kobo: number | null | undefined): number {
  return (kobo ?? 0) / 100;
}

/** 41500000 → "₦415,000.00" */
export function formatMoney(kobo: number | null | undefined): string {
  const amount = toNaira(kobo);
  const formatted = amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return store.currency.position === "before"
    ? `${store.currency.symbol}${formatted}`
    : `${formatted}${store.currency.symbol}`;
}

/** Same, without decimals — for compact places like cards. */
export function formatMoneyShort(kobo: number | null | undefined): string {
  const amount = Math.round(toNaira(kobo));
  const formatted = amount.toLocaleString("en-NG");
  return store.currency.position === "before"
    ? `${store.currency.symbol}${formatted}`
    : `${formatted}${store.currency.symbol}`;
}

/** Free above the configured threshold, flat fee below. Empty cart ships free. */
export function shippingFor(subtotalKobo: number): number {
  if (subtotalKobo <= 0) return 0;
  return subtotalKobo >= freeShippingThresholdKobo ? 0 : flatShippingFeeKobo;
}

/** How much more the customer must spend to unlock free delivery. */
export function amountToFreeShipping(subtotalKobo: number): number {
  return Math.max(0, freeShippingThresholdKobo - subtotalKobo);
}

/** Whole-percent discount, or 0 when not on sale. */
export function discountPercent(
  price: number,
  compareAtPrice: number | null | undefined,
): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round((1 - price / compareAtPrice) * 100);
}
