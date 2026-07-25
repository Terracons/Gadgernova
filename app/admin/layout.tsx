import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/admin";
import { getAdmin } from "@/lib/auth";
import { store } from "@/store.config";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

function splitName(name: string): [string, string] {
  const match = name.match(/^(.+?)([A-Z][a-z0-9]*)$/);
  if (!match || !match[1]) return [name, ""];
  return [match[1], match[2]];
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  const [head, tail] = splitName(store.name);

  // The login page renders inside this layout too, so the chrome is only
  // shown once signed in.
  if (!admin) {
    return <div className="admin-body">{children}</div>;
  }

  return (
    <div className="admin-body">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            {head}
            {tail && <em>{tail}</em>}
          </div>
          <div className="admin-tag">{store.tagline}</div>

          <nav className="admin-nav">
            <Link href="/admin">Dashboard</Link>

            <div className="sep">Catalog</div>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/categories">Categories</Link>
            <Link href="/admin/import">Bulk import</Link>

            <div className="sep">Sales</div>
            <Link href="/admin/orders">Orders</Link>

            <div className="sep">Store</div>
            <Link href="/" target="_blank">
              View storefront ↗
            </Link>
            <form action={logout}>
              <button type="submit">Log out</button>
            </form>
          </nav>
        </aside>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
