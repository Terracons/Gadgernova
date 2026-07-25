"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveProduct, type ActionResult } from "@/app/actions/admin";
import { deleteProductImage } from "@/app/actions/admin";
import { store } from "@/store.config";

export interface ProductFormData {
  id: number;
  title: string;
  sku: string | null;
  brand: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  condition: string;
  specDisplay: string | null;
  specProcessor: string | null;
  specRam: string | null;
  specStorage: string | null;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: number | null;
  images: { id: number; url: string }[];
}

export default function ProductForm({
  product,
  categories,
  storageBackend,
  saved,
}: {
  product: ProductFormData | null;
  categories: { id: number; name: string }[];
  storageBackend: string;
  saved?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveProduct,
    null,
  );

  // Prices are stored in kobo; the form works in naira.
  const naira = (kobo: number | null | undefined) =>
    kobo == null ? "" : (kobo / 100).toFixed(2);

  return (
    <>
      <div className="admin-topbar">
        <h1>{product ? "Edit product" : "New product"}</h1>
        <Link className="a-btn ghost" href="/admin/products">
          ← Back to products
        </Link>
      </div>

      {saved && !state && <div className="a-alert good">Saved.</div>}
      {state?.message && (
        <div className={`a-alert ${state.ok ? "good" : "bad"}`}>
          {state.message}
        </div>
      )}

      <form action={formAction}>
        {product && <input type="hidden" name="productId" value={product.id} />}

        <div className="a-grid a-grid-2" style={{ alignItems: "start" }}>
          <div>
            <div className="a-card">
              <h2>Details</h2>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  name="title"
                  required
                  defaultValue={product?.title ?? ""}
                  placeholder="HP EliteBook 830 G7 | Core i5 | 16GB RAM"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  defaultValue={product?.description ?? ""}
                  placeholder="Condition notes, what's included, warranty…"
                />
              </div>

              <div className="a-grid a-grid-2" style={{ gap: 12 }}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="brand">Brand</label>
                  <input
                    id="brand"
                    name="brand"
                    list="brands"
                    defaultValue={product?.brand ?? ""}
                  />
                  <datalist id="brands">
                    <option>HP</option>
                    <option>Dell</option>
                    <option>Apple</option>
                    <option>Lenovo</option>
                    <option>Asus</option>
                    <option>Acer</option>
                    <option>Samsung</option>
                  </datalist>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="sku">SKU</label>
                  <input
                    id="sku"
                    name="sku"
                    defaultValue={product?.sku ?? ""}
                    placeholder="HP-830-G7-01"
                  />
                </div>
              </div>

              <div className="a-grid a-grid-2" style={{ gap: 12 }}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="categoryId">Category</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    defaultValue={product?.categoryId ?? ""}
                  >
                    <option value="">— none —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="condition">Condition</label>
                  <select
                    id="condition"
                    name="condition"
                    defaultValue={product?.condition ?? store.conditions[0]}
                  >
                    {store.conditions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="a-card">
              <h2>Specifications</h2>
              <p className="a-muted" style={{ fontSize: 13, marginTop: -6 }}>
                Shown as badges on product cards. Leave blank to hide.
              </p>
              <div className="a-grid a-grid-2" style={{ gap: 12 }}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="specDisplay">Display</label>
                  <input
                    id="specDisplay"
                    name="specDisplay"
                    placeholder="13.3-inch"
                    defaultValue={product?.specDisplay ?? ""}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="specProcessor">Processor</label>
                  <input
                    id="specProcessor"
                    name="specProcessor"
                    placeholder="Intel Core i5"
                    defaultValue={product?.specProcessor ?? ""}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="specRam">RAM</label>
                  <input
                    id="specRam"
                    name="specRam"
                    placeholder="16GB"
                    defaultValue={product?.specRam ?? ""}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="specStorage">Storage</label>
                  <input
                    id="specStorage"
                    name="specStorage"
                    placeholder="256GB SSD"
                    defaultValue={product?.specStorage ?? ""}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="a-card">
              <h2>Pricing &amp; stock</h2>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="price">
                  Price ({store.currency.symbol}) *
                </label>
                <input
                  id="price"
                  name="price"
                  required
                  inputMode="decimal"
                  placeholder="415000"
                  defaultValue={naira(product?.price)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="compareAtPrice">
                  Compare-at price ({store.currency.symbol})
                </label>
                <input
                  id="compareAtPrice"
                  name="compareAtPrice"
                  inputMode="decimal"
                  placeholder="485000"
                  defaultValue={naira(product?.compareAtPrice)}
                />
                <p className="a-muted" style={{ fontSize: 12, margin: "5px 0 0" }}>
                  Higher than price → shows a strikethrough and Sale badge.
                </p>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="stock">Stock quantity</label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={product?.stock ?? 0}
                />
              </div>

              <div className="a-check">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  defaultChecked={product?.isActive ?? true}
                />
                <label htmlFor="isActive">Visible in store</label>
              </div>

              <div className="a-check">
                <input
                  id="isFeatured"
                  name="isFeatured"
                  type="checkbox"
                  defaultChecked={product?.isFeatured ?? false}
                />
                <label htmlFor="isFeatured">Feature on homepage</label>
              </div>
            </div>

            <div className="a-card">
              <h2>Images</h2>
              <p className="a-muted" style={{ fontSize: 13, marginTop: -6 }}>
                Uploading to {storageBackend}. The first image is the main one.
              </p>

              {product && product.images.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  {product.images.map((image) => (
                    <div key={image.id}>
                      <img
                        src={image.url}
                        alt=""
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid var(--a-line)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="images">Add images</label>
                <input
                  id="images"
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                />
                <p className="a-muted" style={{ fontSize: 12, margin: "5px 0 0" }}>
                  JPG, PNG, WebP or AVIF. Large files are resized automatically.
                </p>
              </div>
            </div>

            <button
              className="a-btn block"
              type="submit"
              disabled={pending}
              style={{ padding: 12 }}
            >
              {pending
                ? "Saving…"
                : product
                  ? "Save changes"
                  : "Create product"}
            </button>
          </div>
        </div>
      </form>

      {/* Image deletion is a separate form — nesting forms is invalid HTML. */}
      {product && product.images.length > 0 && (
        <div className="a-card">
          <h2>Remove an image</h2>
          <div className="a-row">
            {product.images.map((image) => (
              <form key={image.id} action={deleteProductImage}>
                <input type="hidden" name="imageId" value={image.id} />
                <button className="a-btn danger sm" type="submit">
                  Remove image {image.id}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
