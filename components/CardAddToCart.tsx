"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";

/**
 * Compact "Add to cart" button shown on every product card (home + shop).
 * Adds one unit, opens the mini-cart drawer for immediate feedback, and
 * briefly flips to a confirmation label.
 */
export default function CardAddToCart({
  productId,
  inStock,
  title,
}: {
  productId: number;
  inStock: boolean;
  title: string;
}) {
  const { add, openDrawer } = useCart();
  const [added, setAdded] = useState(false);

  if (!inStock) {
    return (
      <button className="btn block sm card-add" disabled>
        Sold out
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn block sm card-add"
      aria-label={`Add ${title} to cart`}
      onClick={() => {
        add(productId, 1);
        openDrawer();
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? (
        "Added ✓"
      ) : (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          Add to cart
        </>
      )}
    </button>
  );
}
