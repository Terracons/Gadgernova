import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty-state">
        <h2>Well, this page went missing</h2>
        <p className="muted">
          The page or product you&apos;re after isn&apos;t here anymore — but
          there&apos;s plenty more to see. Let&apos;s get you back to it.
        </p>
        <Link href="/shop" className="btn">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
