"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/**
 * Empties the cart once payment is confirmed.
 *
 * Deliberately not done at checkout: if payment fails or the customer backs
 * out, their items should still be waiting for them.
 */
export default function ClearCartOnPaid() {
  const { clear, ready, entries } = useCart();

  useEffect(() => {
    if (ready && entries.length > 0) clear();
  }, [ready, entries.length, clear]);

  return null;
}
