import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty-state">
        <h2>Page not found</h2>
        <p className="muted">
          That page doesn&apos;t exist, or the product is no longer listed.
        </p>
        <Link href="/shop" className="btn">
          Browse the shop
        </Link>
      </div>
    </div>
  );
}
