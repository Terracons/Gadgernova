import Link from "next/link";
import type { ProductCardData } from "@/lib/products";
import CardAddToCart from "@/components/CardAddToCart";

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <article className="card">
      <Link href={`/product/${product.slug}`} className="card-media">
        {product.onSale && (
          <span className="badge">-{product.discountPercent}%</span>
        )}
        {!product.inStock && <span className="badge out">Sold out</span>}

        {product.image ? (
          // Plain <img>: images come from R2 or local uploads on arbitrary
          // domains, and next/image would need each host allow-listed.
          <img src={product.image} alt={product.title} loading="lazy" />
        ) : (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: "100%",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            No image
          </div>
        )}
      </Link>

      <div className="card-body">
        {product.brand && <div className="card-brand">{product.brand}</div>}

        <Link href={`/product/${product.slug}`}>
          <h3 className="card-title">{product.title}</h3>
        </Link>

        {product.specs.length > 0 && (
          <div className="specs">
            {product.specs.slice(0, 4).map((spec) => (
              <span key={spec.label} className="spec">
                {spec.value}
              </span>
            ))}
          </div>
        )}

        <div className="price-row">
          <span className="price">{product.priceDisplay}</span>
          {product.onSale && (
            <span className="price-was">{product.compareAtPriceDisplay}</span>
          )}
        </div>

        <CardAddToCart
          productId={product.id}
          inStock={product.inStock}
          title={product.title}
        />
      </div>
    </article>
  );
}
