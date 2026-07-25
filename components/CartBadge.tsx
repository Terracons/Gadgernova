"use client";

import { useCart } from "@/lib/cart-context";

export default function CartBadge() {
  const { count, ready } = useCart();
  // Render nothing until hydration, otherwise server and client HTML differ.
  if (!ready || count === 0) return null;
  return <span className="cart-badge">{count}</span>;
}
