import Link from "next/link";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { listBrands, listCategories, listProducts } from "@/lib/products";
import { store } from "@/store.config";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop all products",
  description: `Browse everything available at ${store.name}. Filter by category, brand and price.`,
};

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;

  const [result, categories, brands] = await Promise.all([
    listProducts({
      category: params.category,
      brand: params.brand,
      search: params.search,
      sort: params.sort ?? "newest",
      onSale: params.onSale === "true",
      inStock: params.inStock === "true",
      featured: params.featured === "true",
      page,
    }).catch(() => null),
    listCategories().catch(() => []),
    listBrands().catch(() => []),
  ]);

  // Keep active filters when paginating.
  const pageLink = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    query.set("page", String(target));
    return `/shop?${query.toString()}`;
  };

  const heading = params.search
    ? `Results for “${params.search}”`
    : params.category
      ? (categories.find((c) => c.slug === params.category)?.name ?? "Shop")
      : params.onSale === "true"
        ? "Deals"
        : "All products";

  return (
    <div className="container section">
      <h1>{heading}</h1>
      {result && (
        <p className="muted" style={{ marginTop: 0 }}>
          {result.total} product{result.total === 1 ? "" : "s"}
        </p>
      )}

      <form
        method="get"
        action="/shop"
        className="panel"
        style={{ margin: "20px 0 26px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="search">Search</label>
            <input
              id="search"
              name="search"
              defaultValue={params.search ?? ""}
              placeholder="MacBook, EliteBook…"
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              defaultValue={params.category ?? ""}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="brand">Brand</label>
            <select id="brand" name="brand" defaultValue={params.brand ?? ""}>
              <option value="">All</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="sort">Sort</label>
            <select id="sort" name="sort" defaultValue={params.sort ?? "newest"}>
              <option value="newest">Newest</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
              <option value="title">Name</option>
            </select>
          </div>

          <button className="btn" type="submit">
            Apply
          </button>
        </div>
      </form>

      {result === null ? (
        <div className="notice warn">
          Couldn&apos;t load products right now. Please refresh in a moment.
        </div>
      ) : result.items.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing matched</h2>
          <p className="muted">
            Try removing a filter or searching differently.
          </p>
          <Link href="/shop" className="btn ghost">
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <div className="grid">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {result.pages > 1 && (
            <div
              className="row"
              style={{ justifyContent: "center", marginTop: 34 }}
            >
              {page > 1 && (
                <Link className="btn ghost sm" href={pageLink(page - 1)}>
                  ← Previous
                </Link>
              )}
              <span className="muted" style={{ fontSize: 14.5 }}>
                Page {page} of {result.pages}
              </span>
              {page < result.pages && (
                <Link className="btn ghost sm" href={pageLink(page + 1)}>
                  Next →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
