"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { store } from "@/store.config";

export default function AddToCart({
  productId,
  stock,
  title,
  priceDisplay,
}: {
  productId: number;
  stock: number;
  title: string;
  priceDisplay: string;
}) {
  const { add, openDrawer } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const whatsappUrl = store.options.enableWhatsAppOrder
    ? `https://wa.me/${store.contact.whatsapp}?text=${encodeURIComponent(
        `Hi ${store.name}! 👋 I'd love to order this:\n\n${title}\n${priceDisplay}\n\nIs it still available?`,
      )}`
    : null;

  if (stock <= 0) {
    return (
      <div className="stack">
        <button className="btn block" disabled>
          Out of stock
        </button>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn whatsapp block"
          >
            Ask us about it on WhatsApp
          </a>
        )}
      </div>
    );
  }

  const max = Math.min(stock, store.options.maxQuantityPerItem);

  return (
    <div className="stack">
      <div className="row" style={{ gap: 10 }}>
        <label htmlFor="qty" style={{ margin: 0 }}>
          Qty
        </label>
        <select
          id="qty"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          style={{ width: 80 }}
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {stock <= 3 && (
          <span className="muted" style={{ fontSize: 14 }}>
            Only {stock} left
          </span>
        )}
      </div>

      <button
        className="btn block"
        onClick={() => {
          add(productId, quantity);
          openDrawer();
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
      >
        {added ? "Added to cart ✓" : "Add to cart"}
      </button>

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn whatsapp block"
        >
          Order on WhatsApp
        </a>
      )}
    </div>
  );
}
