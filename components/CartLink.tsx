"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import CartBadge from "@/components/CartBadge";

/**
 * Header cart link. With JS it opens the slide-out drawer; without JS it still
 * navigates to the full /cart page, so the cart is always reachable.
 */
export default function CartLink() {
  const { openDrawer } = useCart();
  return (
    <Link
      href="/cart"
      className="cart-link"
      onClick={(e) => {
        e.preventDefault();
        openDrawer();
      }}
    >
      Cart
      <CartBadge />
    </Link>
  );
}
