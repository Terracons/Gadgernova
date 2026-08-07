"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { store, freeShippingThresholdKobo } from "@/store.config";

/**
 * Floating cart button + slide-out mini-cart.
 *
 * Mounted once in the root layout. The floating button appears whenever the
 * cart has items, so the shopper always knows something is in it; adding a
 * product also opens the drawer for instant feedback.
 */
export default function CartDrawer() {
  const {
    quote,
    count,
    ready,
    loading,
    drawerOpen,
    openDrawer,
    closeDrawer,
    setQuantity,
    remove,
  } = useCart();

  // Lock body scroll and wire Escape-to-close while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  // Avoid SSR/client mismatch: nothing cart-specific renders until hydrated.
  if (!ready) return null;

  const subtotal = quote?.subtotal ?? 0;
  const remaining = Math.max(0, freeShippingThresholdKobo - subtotal);
  const progress = Math.min(
    100,
    freeShippingThresholdKobo > 0
      ? (subtotal / freeShippingThresholdKobo) * 100
      : 100,
  );
  const maxPerItem = store.options.maxQuantityPerItem;

  return (
    <>
      {count > 0 && !drawerOpen && (
        <button
          type="button"
          className="cart-fab"
          onClick={openDrawer}
          aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
        >
          <svg
            width="20"
            height="20"
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
          <span>Cart</span>
          <span className="cart-fab-count">{count}</span>
        </button>
      )}

      <div
        className={`drawer-overlay ${drawerOpen ? "show" : ""}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside
        className={`drawer ${drawerOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-head">
          <h2 style={{ fontSize: 18 }}>
            Your cart{count > 0 ? ` (${count})` : ""}
          </h2>
          <button
            type="button"
            className="drawer-close"
            onClick={closeDrawer}
            aria-label="Close cart"
          >
            &times;
          </button>
        </div>

        {!quote || quote.isEmpty ? (
          <div className="drawer-body">
            <div className="empty-state" style={{ padding: "48px 8px" }}>
              <p className="muted">
                {loading ? "Updating…" : "Nothing here yet — let's change that."}
              </p>
              <button type="button" className="btn ghost" onClick={closeDrawer}>
                Continue shopping
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              {/* Free-shipping progress */}
              <div className="ship-progress">
                {remaining > 0 ? (
                  <span>
                    You&apos;re{" "}
                    <strong>
                      {store.currency.symbol}
                      {(remaining / 100).toLocaleString()}
                    </strong>{" "}
                    away from free delivery
                  </span>
                ) : (
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>
                    Nice — you&apos;ve unlocked free delivery ✓
                  </span>
                )}
                <div className="ship-bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>

              {quote.removed.length > 0 && (
                <div className="notice warn" style={{ marginBottom: 12 }}>
                  {quote.removed.map((message, i) => (
                    <div key={i}>{message}</div>
                  ))}
                </div>
              )}

              {quote.lines.map((line) => {
                const atMax = line.quantity >= Math.min(line.stock, maxPerItem);
                return (
                  <div key={line.productId} className="d-line">
                    <Link
                      href={`/product/${line.slug}`}
                      onClick={closeDrawer}
                      className="d-line-media"
                    >
                      {line.image ? (
                        <img src={line.image} alt={line.title} />
                      ) : (
                        <div className="d-line-noimg" />
                      )}
                    </Link>

                    <div className="d-line-info">
                      <Link
                        href={`/product/${line.slug}`}
                        onClick={closeDrawer}
                        className="d-line-title"
                      >
                        {line.title}
                      </Link>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {line.unitPriceDisplay}
                      </div>
                      {line.adjustment && (
                        <div style={{ fontSize: 12.5, color: "#93370d" }}>
                          {line.adjustment}
                        </div>
                      )}

                      <div className="d-line-controls">
                        <div className="qty">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(line.productId, line.quantity - 1)
                            }
                            aria-label="Decrease quantity"
                          >
                            &minus;
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(line.productId, line.quantity + 1)
                            }
                            disabled={atMax}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="d-line-remove"
                          onClick={() => remove(line.productId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <strong className="d-line-total">
                      {line.lineTotalDisplay}
                    </strong>
                  </div>
                );
              })}
            </div>

            <div className="drawer-foot">
              <div className="summary-row">
                <span className="muted">Subtotal</span>
                <span>{quote.subtotalDisplay}</span>
              </div>
              <div className="summary-row">
                <span className="muted">Delivery</span>
                <span
                  style={
                    quote.shipping === 0
                      ? { color: "var(--success)", fontWeight: 600 }
                      : undefined
                  }
                >
                  {quote.shippingDisplay}
                </span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{quote.totalDisplay}</span>
              </div>

              <Link
                href="/checkout"
                className="btn block"
                style={{ marginTop: 12 }}
                onClick={closeDrawer}
              >
                Checkout
              </Link>
              <Link
                href="/cart"
                className="btn ghost block"
                style={{ marginTop: 10 }}
                onClick={closeDrawer}
              >
                View full cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
