import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { deleteProduct } from "@/app/actions/admin";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const { q = "", page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw ?? 1) || 1);

  const where: Prisma.ProductWhereInput = q
    ? { OR: [{ title: { contains: q } }, { sku: { contains: q } }] }
    : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { position: "asc" }, take: 1 }, category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.product.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <div className="admin-topbar">
        <h1>
          Products{" "}
          <span className="a-muted" style={{ fontSize: 15, fontWeight: 400 }}>
            ({total})
          </span>
        </h1>
        <div className="a-row">
          <form action="/admin/products" className="a-row" style={{ gap: 8 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search title or SKU"
              style={{ width: 220 }}
            />
            <button className="a-btn ghost sm" type="submit">
              Search
            </button>
          </form>
          <Link className="a-btn" href="/admin/products/new">
            + New product
          </Link>
        </div>
      </div>

      <div className="a-card" style={{ padding: 0 }}>
        {products.length === 0 ? (
          <div className="a-empty">
            <p>{q ? "Nothing matched that search." : "No products yet."}</p>
            <Link className="a-btn" href="/admin/products/new">
              Add your first product
            </Link>
            <p style={{ marginTop: 14 }}>
              <Link href="/admin/import">or import many at once from CSV</Link>
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 60 }} />
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ width: 150 }} />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.images[0] ? (
                      <img
                        className="a-thumb"
                        src={product.images[0].url}
                        alt=""
                      />
                    ) : (
                      <div className="a-thumb" />
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/products/${product.id}`}>
                      <strong>{product.title}</strong>
                    </Link>
                    <div className="a-muted" style={{ fontSize: 12 }}>
                      {product.brand ?? "—"}
                      {product.category && ` · ${product.category.name}`}
                      {product.sku && ` · ${product.sku}`}
                    </div>
                  </td>
                  <td>
                    {formatMoney(product.price)}
                    {product.compareAtPrice &&
                      product.compareAtPrice > product.price && (
                        <div
                          className="a-muted"
                          style={{ fontSize: 12, textDecoration: "line-through" }}
                        >
                          {formatMoney(product.compareAtPrice)}
                        </div>
                      )}
                  </td>
                  <td>
                    <span
                      className={`pill ${
                        product.stock === 0
                          ? "bad"
                          : product.stock <= 2
                            ? "warn"
                            : "mute"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${product.isActive ? "good" : "mute"}`}>
                      {product.isActive ? "Active" : "Hidden"}
                    </span>
                    {product.isFeatured && (
                      <span className="pill warn" style={{ marginLeft: 4 }}>
                        Featured
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="a-row" style={{ gap: 6 }}>
                      <Link
                        className="a-btn ghost sm"
                        href={`/admin/products/${product.id}`}
                      >
                        Edit
                      </Link>
                      <form action={deleteProduct}>
                        <input
                          type="hidden"
                          name="productId"
                          value={product.id}
                        />
                        <button className="a-btn danger sm" type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="a-row" style={{ justifyContent: "center" }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
            p === page ? (
              <span key={p} className="a-btn sm">
                {p}
              </span>
            ) : (
              <Link
                key={p}
                className="a-btn ghost sm"
                href={`/admin/products?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              >
                {p}
              </Link>
            ),
          )}
        </div>
      )}
    </>
  );
}
