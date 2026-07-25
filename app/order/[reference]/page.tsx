import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { verifyOrder } from "@/app/actions/order";
import ClearCartOnPaid from "@/components/ClearCartOnPaid";
import { isPaid } from "@/lib/orders";
import { store } from "@/store.config";

// Always fresh — this page reports payment status.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order status",
  robots: { index: false, follow: false },
};

type Params = Promise<{ reference: string }>;

export default async function OrderPage({ params }: { params: Params }) {
  const { reference } = await params;
  const order = await verifyOrder(reference).catch(() => null);

  if (!order) notFound();

  const paid = isPaid(order.status);

  return (
    <div className="container section" style={{ maxWidth: 680 }}>
      {paid && <ClearCartOnPaid />}

      <div className={`notice ${paid ? "good" : "warn"}`}>
        {paid ? (
          <>
            <strong>Payment confirmed.</strong> Thank you — we&apos;re preparing
            your order.
          </>
        ) : (
          <>
            <strong>Order received.</strong> We haven&apos;t confirmed payment
            yet. If you&apos;ve just paid, refresh in a moment.
          </>
        )}
      </div>

      <h1>Order {order.reference}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Confirmation sent to {order.customerEmail}
      </p>

      <div className="panel" style={{ marginTop: 20 }}>
        {order.items.map((item, index) => (
          <div key={index} className="summary-row">
            <span>
              {item.quantity} × {item.title}
            </span>
            <span>{item.lineTotalDisplay}</span>
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
          <span>{order.subtotalDisplay}</span>
        </div>
        <div className="summary-row">
          <span className="muted">Delivery</span>
          <span>{order.shippingDisplay}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>{order.totalDisplay}</span>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 14, marginTop: 18 }}>
        Keep your reference <strong>{order.reference}</strong> handy — quote it
        if you contact us about this order.
      </p>

      <div className="row">
        <Link href="/shop" className="btn">
          Continue shopping
        </Link>
        {store.options.enableWhatsAppOrder && (
          <a
            href={`https://wa.me/${store.contact.whatsapp}?text=${encodeURIComponent(
              `Hello, I'd like to ask about order ${order.reference}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn ghost"
          >
            Contact us on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
