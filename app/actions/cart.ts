"use server";

import { buildQuote, type Quote } from "@/lib/quote";

/**
 * Re-price a client-side cart.
 *
 * Called from the cart context whenever items change. This is the only path by
 * which the browser learns prices, and it always reads them from the database.
 */
export async function quoteCart(entries: unknown): Promise<Quote> {
  return buildQuote(entries);
}
