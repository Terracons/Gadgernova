"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { store } from "@/store.config";

export default function CartPage() {
  const { quote, loading, ready, entries, setQuantity, remove } = useCart();

  if (!ready) {
    return (
      <div className="container section">
        <h1>Your cart</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p className="muted">Browse the store and add something you like.</p>
          <Link href="/shop" className="btn">
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container section">
        <h1>Your cart</h1>
        <p className="muted">
          {loading ? "Updating…" : "Couldn't load your cart. Please refresh."}
        </p>
      </div>
    );
  }

  const toFreeShipping =
    store.shipping.freeAbove * 100 - quote.subtotal;

  return (
    <div className="container section">
      <h1>Your cart</h1>

      {quote.removed.length > 0 && (
        <div className="notice warn">
          {quote.removed.map((message, index) => (
            <div key={index}>{message}</div>
          ))}
        </div>
      )}

      <div className="split">
        <div className="stack">
          {quote.lines.map((line) => (
            <div
              key={line.productId}
              className="panel"
              style={{ display: "flex", gap: 16, alignItems: "center" }}
            >
              <Link
                href={`/product/${line.slug}`}
                style={{ flexShrink: 0, width: 84, height: 84 }}
              >
                {line.image ? (
                  <img
                    src={line.image}
                    alt={line.title}
                    style={{
                      width: 84,
                      height: 84,
                      objectFit: "contain",
                      background: "var(--surface)",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      background: "var(--surface)",
                      borderRadius: 8,
                    }}
                  />
                )}
              </Link>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/product/${line.slug}`}>
                  <strong style={{ fontSize: 15 }}>{line.title}</strong>
                </Link>
                <div className="muted" style={{ fontSize: 14 }}>
                  {line.unitPriceDisplay} each
                </div>
                {line.adjustment && (
                  <div style={{ fontSize: 13, color: "#93370d" }}>
                    {line.adjustment}
                  </div>
                )}

                <div className="row" style={{ gap: 10, marginTop: 8 }}>
                  <select
                    value={line.quantity}
                    onChange={(e) =>
                      setQuantity(line.productId, Number(e.target.value))
                    }
                    style={{ width: 72 }}
                    aria-label={`Quantity for ${line.title}`}
                  >
                    {Array.from(
                      {
                        length: Math.min(
                          line.stock,
                          store.options.maxQuantityPerItem,
                        ),
                      },
                      (_, i) => i + 1,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn ghost sm"
                    onClick={() => remove(line.productId)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <strong style={{ fontSize: 16, whiteSpace: "nowrap" }}>
                {line.lineTotalDisplay}
              </strong>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Order summary</h2>

          <div className="summary-row">
            <span className="muted">
              Subtotal ({quote.count} item{quote.count === 1 ? "" : "s"})
            </span>
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

          {quote.shipping > 0 && toFreeShipping > 0 && (
            <p className="muted" style={{ fontSize: 13.5 }}>
              Spend {store.currency.symbol}
              {(toFreeShipping / 100).toLocaleString()} more for free delivery.
            </p>
          )}

          <Link href="/checkout" className="btn block" style={{ marginTop: 12 }}>
            Proceed to checkout
          </Link>
          <Link href="/shop" className="btn ghost block" style={{ marginTop: 10 }}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
