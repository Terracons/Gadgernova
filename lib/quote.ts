import "server-only";

import { prisma } from "@/lib/prisma";
import { formatMoney, shippingFor } from "@/lib/money";
import { store } from "@/store.config";

/**
 * Server-side cart pricing.
 *
 * The browser sends only [{productId, quantity}]. Every price, title and stock
 * level is re-read from the database here, so nothing a customer edits in
 * devtools or localStorage can change what they are charged.
 *
 * Unbuyable items are dropped and over-ordered quantities capped, with each
 * change recorded so the UI can explain what happened rather than silently
 * showing a different total.
 */

export interface CartEntry {
  productId: number;
  quantity: number;
}

export interface QuoteLine {
  productId: number;
  slug: string;
  title: string;
  unitPrice: number;
  unitPriceDisplay: string;
  quantity: number;
  lineTotal: number;
  lineTotalDisplay: string;
  image: string | null;
  stock: number;
  adjustment: string | null;
}

export interface Quote {
  lines: QuoteLine[];
  removed: string[];
  wasAdjusted: boolean;
  count: number;
  subtotal: number;
  subtotalDisplay: string;
  shipping: number;
  shippingDisplay: string;
  total: number;
  totalDisplay: string;
  isEmpty: boolean;
}

export const emptyQuote: Quote = {
  lines: [],
  removed: [],
  wasAdjusted: false,
  count: 0,
  subtotal: 0,
  subtotalDisplay: formatMoney(0),
  shipping: 0,
  shippingDisplay: "Free",
  total: 0,
  totalDisplay: formatMoney(0),
  isEmpty: true,
};

/** Coerce untrusted input into clean {productId, quantity} pairs. */
export function normalizeEntries(input: unknown): CartEntry[] {
  if (!Array.isArray(input)) return [];

  const merged = new Map<number, number>();
  for (const raw of input) {
    const productId = Number((raw as CartEntry)?.productId);
    const quantity = Number((raw as CartEntry)?.quantity);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const next = (merged.get(productId) ?? 0) + Math.floor(quantity);
    merged.set(productId, Math.min(next, store.options.maxQuantityPerItem));
  }

  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export async function buildQuote(input: unknown): Promise<Quote> {
  const entries = normalizeEntries(input);
  if (entries.length === 0) return emptyQuote;

  const products = await prisma.product.findMany({
    where: { id: { in: entries.map((e) => e.productId) } },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: QuoteLine[] = [];
  const removed: string[] = [];

  for (const entry of entries) {
    const product = byId.get(entry.productId);

    if (!product) {
      removed.push("An item in your cart is no longer available");
      continue;
    }
    if (!product.isActive) {
      removed.push(`${product.title} is no longer available`);
      continue;
    }
    if (product.stock <= 0) {
      removed.push(`${product.title} is out of stock`);
      continue;
    }

    let quantity = entry.quantity;
    let adjustment: string | null = null;
    if (quantity > product.stock) {
      adjustment = `Only ${product.stock} left — quantity reduced`;
      quantity = product.stock;
    }

    const lineTotal = product.price * quantity;
    lines.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      unitPrice: product.price,
      unitPriceDisplay: formatMoney(product.price),
      quantity,
      lineTotal,
      lineTotalDisplay: formatMoney(lineTotal),
      image: product.images[0]?.url ?? null,
      stock: product.stock,
      adjustment,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  return {
    lines,
    removed,
    wasAdjusted: removed.length > 0 || lines.some((l) => l.adjustment !== null),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    subtotalDisplay: formatMoney(subtotal),
    shipping,
    shippingDisplay: shipping === 0 ? "Free" : formatMoney(shipping),
    total,
    totalDisplay: formatMoney(total),
    isEmpty: lines.length === 0,
  };
}
