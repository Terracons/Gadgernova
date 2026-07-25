import type { Metadata } from "next";
import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import Brand from "@/components/Brand";
import CartBadge from "@/components/CartBadge";
import { store } from "@/store.config";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${store.name} — ${store.tagline}`,
    template: `%s | ${store.name}`,
  },
  description: store.description,
  openGraph: {
    type: "website",
    siteName: store.name,
    description: store.description,
    images: store.logo ? [store.logo] : [],
  },
  icons: store.logo ? { icon: store.logo } : undefined,
  robots: { index: true, follow: true },
};

/**
 * Brand colours from store.config.ts become CSS variables here, so the whole
 * site restyles from that one file without touching any CSS.
 */
const themeVariables = `
  :root {
    --primary: ${store.colors.primary};
    --primary-dark: ${store.colors.primaryDark};
    --dark: ${store.colors.dark};
    --sale: ${store.colors.sale};
    --success: ${store.colors.success};
  }
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeVariables }} />
      </head>
      <body>
        <CartProvider>
          {store.copy.announcement && (
            <div className="announce">{store.copy.announcement}</div>
          )}

          <header className="header">
            <div className="header-inner">
              <Brand />
              <nav className="nav">
                <Link href="/shop">Shop</Link>
                <Link href="/shop?onSale=true" className="hide-sm">
                  Deals
                </Link>
                <Link href="/cart" className="cart-link">
                  Cart
                  <CartBadge />
                </Link>
              </nav>
            </div>
          </header>

          <main>{children}</main>

          <footer className="footer">
            <div className="container footer-grid">
              <div>
                <div className="logo" style={{ marginBottom: 8 }}>
                  {store.name}
                </div>
                <p className="tag">{store.tagline}</p>
              </div>

              <div>
                <h3>Shop</h3>
                <Link href="/shop">All products</Link>
                <Link href="/shop?onSale=true">On sale</Link>
                <Link href="/shop?inStock=true">In stock</Link>
              </div>

              <div>
                <h3>Contact</h3>
                {store.contact.email && (
                  <a href={`mailto:${store.contact.email}`}>
                    {store.contact.email}
                  </a>
                )}
                {store.contact.phoneDisplay && (
                  <a href={`tel:${store.contact.phoneDisplay.replace(/\s/g, "")}`}>
                    {store.contact.phoneDisplay}
                  </a>
                )}
                {store.contact.address && (
                  <span className="muted">{store.contact.address}</span>
                )}
              </div>

              <div>
                <h3>Follow</h3>
                {store.social.instagram && (
                  <a href={store.social.instagram} rel="noopener noreferrer">
                    Instagram
                  </a>
                )}
                {store.social.facebook && (
                  <a href={store.social.facebook} rel="noopener noreferrer">
                    Facebook
                  </a>
                )}
                {store.social.twitter && (
                  <a href={store.social.twitter} rel="noopener noreferrer">
                    X (Twitter)
                  </a>
                )}
                {store.social.tiktok && (
                  <a href={store.social.tiktok} rel="noopener noreferrer">
                    TikTok
                  </a>
                )}
              </div>
            </div>

            <div
              className="container muted"
              style={{ marginTop: 26, fontSize: 13.5 }}
            >
              © {year} {store.name}. All rights reserved.
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
