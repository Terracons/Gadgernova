"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCheckout } from "@/app/actions/checkout";
import { useCart } from "@/lib/cart-context";
import { store } from "@/store.config";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { entries, quote, ready, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && entries.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h2>Nothing to check out</h2>
          <p className="muted">Your cart is empty.</p>
          <Link href="/shop" className="btn">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const result = await createCheckout({
        customerName: String(form.get("customerName") ?? ""),
        customerEmail: String(form.get("customerEmail") ?? ""),
        customerPhone: String(form.get("customerPhone") ?? ""),
        shippingAddress: String(form.get("shippingAddress") ?? ""),
        city: String(form.get("city") ?? ""),
        state: String(form.get("state") ?? ""),
        note: String(form.get("note") ?? ""),
        entries,
      });

      if (result.status === "redirect") {
        // Cart is cleared on the success page, not here — a failed payment
        // should leave the customer's items intact.
        window.location.href = result.checkoutUrl;
        return;
      }

      if (result.status === "manual") {
        clear();
        router.push(`/order/${result.reference}`);
        return;
      }

      setError(result.message);
      setSubmitting(false);
    } catch {
      setError(
        "We couldn't reach the store. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="container section">
      <h1>Checkout</h1>

      {error && <div className="notice bad">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="split">
          <div className="panel">
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Delivery details</h2>

            <div className="field">
              <label htmlFor="customerName">Full name *</label>
              <input
                id="customerName"
                name="customerName"
                required
                autoComplete="name"
              />
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="customerEmail">Email *</label>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label htmlFor="customerPhone">Phone *</label>
                <input
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="0801 234 5678"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="shippingAddress">Delivery address *</label>
              <textarea
                id="shippingAddress"
                name="shippingAddress"
                required
                rows={3}
                autoComplete="street-address"
                placeholder="Street, area, landmark"
              />
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="city">City</label>
                <input id="city" name="city" autoComplete="address-level2" />
              </div>
              <div className="field">
                <label htmlFor="state">State</label>
                <select id="state" name="state" defaultValue="">
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="note">Order note (optional)</label>
              <textarea
                id="note"
                name="note"
                rows={2}
                placeholder="Anything we should know about delivery"
              />
            </div>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>Your order</h2>

            {quote?.lines.map((line) => (
              <div
                key={line.productId}
                className="summary-row"
                style={{ alignItems: "flex-start" }}
              >
                <span>
                  {line.quantity} × {line.title}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {line.lineTotalDisplay}
                </span>
              </div>
            ))}

            <div
              className="summary-row"
              style={{
                borderTop: "1px solid var(--line)",
                marginTop: 10,
                paddingTop: 12,
              }}
            >
              <span className="muted">Subtotal</span>
              <span>{quote?.subtotalDisplay ?? "—"}</span>
            </div>
            <div className="summary-row">
              <span className="muted">Delivery</span>
              <span
                style={
                  quote?.shipping === 0
                    ? { color: "var(--success)", fontWeight: 600 }
                    : undefined
                }
              >
                {quote?.shippingDisplay ?? "—"}
              </span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{quote?.totalDisplay ?? "—"}</span>
            </div>

            <button
              className="btn block"
              type="submit"
              disabled={submitting || !quote}
              style={{ marginTop: 14 }}
            >
              {submitting ? "Processing…" : "Place order"}
            </button>

            <p
              className="muted"
              style={{ fontSize: 13, marginTop: 12, marginBottom: 0 }}
            >
              You&apos;ll be redirected to Paystack to pay securely by card,
              bank transfer or USSD. We never see your card details.
            </p>

            {store.options.enableWhatsAppOrder && (
              <a
                href={`https://wa.me/${store.contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn whatsapp block"
                style={{ marginTop: 10 }}
              >
                Prefer to order on WhatsApp?
              </a>
            )}

            <Link href="/cart" className="btn ghost block" style={{ marginTop: 10 }}>
              Back to cart
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
