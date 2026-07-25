import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import { getProductBySlug } from "@/lib/products";
import { toNaira } from "@/lib/money";
import { store } from "@/store.config";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Product not found" };

  const description =
    product.description?.slice(0, 155) ??
    `${product.title} — ${product.condition}, available at ${store.name} with nationwide delivery.`;

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.image ? [{ url: product.image }] : [],
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Rich-result markup so price and availability can appear in Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.map((i) => i.url),
    description: product.description ?? product.title,
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: store.currency.code,
      price: toNaira(product.price).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
        <Link href="/shop">Shop</Link>
        {product.categorySlug && (
          <>
            {" / "}
            <Link href={`/shop?category=${product.categorySlug}`}>
              {product.category}
            </Link>
          </>
        )}
      </p>

      <div className="split wide-left">
        <div>
          <div
            className="panel"
            style={{ padding: 0, overflow: "hidden", aspectRatio: "4 / 3" }}
          >
            {product.images[0] ? (
              <img
                src={product.images[0].url}
                alt={product.images[0].alt}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: 16,
                }}
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "100%",
                  color: "var(--muted)",
                }}
              >
                No image
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))",
                gap: 10,
                marginTop: 12,
              }}
            >
              {product.images.slice(1).map((image, index) => (
                <img
                  key={index}
                  src={image.url}
                  alt={image.alt}
                  loading="lazy"
                  style={{
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="stack">
          {product.brand && <div className="card-brand">{product.brand}</div>}
          <h1 style={{ margin: 0 }}>{product.title}</h1>

          <div className="price-row">
            <span className="price" style={{ fontSize: 26 }}>
              {product.priceDisplay}
            </span>
            {product.onSale && (
              <>
                <span className="price-was" style={{ fontSize: 16 }}>
                  {product.compareAtPriceDisplay}
                </span>
                <span
                  className="badge"
                  style={{ position: "static", display: "inline-block" }}
                >
                  Save {product.discountPercent}%
                </span>
              </>
            )}
          </div>

          <div className="row" style={{ gap: 8 }}>
            {store.options.showCondition && (
              <span className="spec">{product.condition}</span>
            )}
            <span
              className="spec"
              style={product.inStock ? { color: "var(--success)" } : undefined}
            >
              {product.inStock ? "In stock" : "Out of stock"}
            </span>
          </div>

          {product.specs.length > 0 && (
            <div className="panel" style={{ padding: 16 }}>
              <table style={{ width: "100%", fontSize: 14.5 }}>
                <tbody>
                  {product.specs.map((spec) => (
                    <tr key={spec.label}>
                      <td
                        className="muted"
                        style={{ padding: "5px 0", width: "40%" }}
                      >
                        {spec.label}
                      </td>
                      <td style={{ padding: "5px 0", fontWeight: 500 }}>
                        {spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddToCart
            productId={product.id}
            stock={product.stock}
            title={product.title}
            priceDisplay={product.priceDisplay}
          />

          {product.description && (
            <div style={{ whiteSpace: "pre-wrap", fontSize: 15 }}>
              {product.description}
            </div>
          )}

          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            Free delivery on orders over{" "}
            {store.currency.symbol}
            {store.shipping.freeAbove.toLocaleString()} ·{" "}
            {store.copy.warranty}
          </p>
        </div>
      </div>

      {product.related.length > 0 && (
        <section className="section">
          <h2 style={{ marginBottom: 20 }}>You might also like</h2>
          <div className="grid">
            {product.related.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
