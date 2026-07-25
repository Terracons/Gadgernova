import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { listCategories, listProducts } from "@/lib/products";
import { store } from "@/store.config";

export const revalidate = 60;

export default async function HomePage() {
  // Fail soft: a database hiccup shouldn't produce a broken storefront.
  const [featured, latest, categories] = await Promise.all([
    listProducts({ featured: true }).catch(() => null),
    listProducts({ sort: "newest" }).catch(() => null),
    listCategories().catch(() => []),
  ]);

  const down = featured === null && latest === null;

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">{store.tagline}</p>
          <h1>{store.copy.heroHeading}</h1>
          <p>{store.copy.heroSubheading}</p>
          <div className="row">
            <Link href="/shop" className="btn">
              Shop all products
            </Link>
            <Link href="/shop?onSale=true" className="btn ghost">
              View deals
            </Link>
          </div>
        </div>
      </section>

      {down && (
        <div className="container" style={{ paddingTop: 24 }}>
          <div className="notice warn">
            We&apos;re having trouble loading products right now. Please refresh
            in a moment.
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="container row">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="btn ghost sm"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured && featured.items.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Featured</h2>
                <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                  Hand-picked, top-condition stock
                </p>
              </div>
              <Link href="/shop?featured=true" className="btn ghost sm">
                View all
              </Link>
            </div>
            <div className="grid">
              {featured.items.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {latest && latest.items.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <h2>Just arrived</h2>
              <Link href="/shop" className="btn ghost sm">
                View all
              </Link>
            </div>
            <div className="grid">
              {latest.items.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!down && latest?.items.length === 0 && (
        <div className="container">
          <div className="empty-state">
            <h2>No products yet</h2>
            <p className="muted">
              Sign in to the admin panel and add your first product.
            </p>
            <Link href="/admin" className="btn">
              Go to admin
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
