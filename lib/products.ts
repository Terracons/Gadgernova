import "server-only";

import { prisma } from "@/lib/prisma";
import { discountPercent, formatMoney } from "@/lib/money";
import { store } from "@/store.config";
import type { Prisma } from "@prisma/client";

/** Shape consumed by product cards and detail pages. */
export interface ProductCardData {
  id: number;
  title: string;
  slug: string;
  brand: string | null;
  condition: string;
  price: number;
  priceDisplay: string;
  compareAtPrice: number | null;
  compareAtPriceDisplay: string | null;
  onSale: boolean;
  discountPercent: number;
  inStock: boolean;
  stock: number;
  image: string | null;
  specs: { label: string; value: string }[];
  category: string | null;
  categorySlug: string | null;
}

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { images: true; category: true };
}>;

export function toCardData(product: ProductWithRelations): ProductCardData {
  const specs = [
    { label: "Display", value: product.specDisplay },
    { label: "Processor", value: product.specProcessor },
    { label: "RAM", value: product.specRam },
    { label: "Storage", value: product.specStorage },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value));

  const onSale = Boolean(
    product.compareAtPrice && product.compareAtPrice > product.price,
  );

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    brand: product.brand,
    condition: product.condition,
    price: product.price,
    priceDisplay: formatMoney(product.price),
    compareAtPrice: product.compareAtPrice,
    compareAtPriceDisplay: product.compareAtPrice
      ? formatMoney(product.compareAtPrice)
      : null,
    onSale,
    discountPercent: discountPercent(product.price, product.compareAtPrice),
    inStock: product.stock > 0,
    stock: product.stock,
    image: product.images[0]?.url ?? null,
    specs,
    category: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
  };
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  onSale?: boolean;
  inStock?: boolean;
  featured?: boolean;
  sort?: string;
  page?: number;
}

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  priceAsc: { price: "asc" },
  priceDesc: { price: "desc" },
  title: { title: "asc" },
};

export async function listProducts(filters: ProductFilters = {}) {
  const perPage = store.options.productsPerPage;
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (filters.category) where.category = { slug: filters.category };
  if (filters.brand) where.brand = filters.brand;
  if (filters.featured) where.isFeatured = true;
  if (filters.inStock) where.stock = { gt: 0 };
  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { title: { contains: term } },
      { brand: { contains: term } },
      { description: { contains: term } },
      { specProcessor: { contains: term } },
    ];
  }

  // Prisma can't compare two columns in a filter, so "on sale" is narrowed to
  // rows that have a compare-at price, then refined in memory below.
  if (filters.onSale) where.compareAtPrice = { not: null };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { position: "asc" } }, category: true },
      orderBy: SORTS[filters.sort ?? "newest"] ?? SORTS.newest,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  const items = rows
    .filter((p) => !filters.onSale || (p.compareAtPrice ?? 0) > p.price)
    .map(toCardData);

  return {
    items,
    page,
    perPage,
    total,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { images: { orderBy: { position: "asc" } }, category: true },
  });
  if (!product) return null;

  const related = await prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: product.id },
      categoryId: product.categoryId,
    },
    include: { images: { orderBy: { position: "asc" } }, category: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 4,
  });

  return {
    ...toCardData(product),
    sku: product.sku,
    description: product.description,
    images: product.images.map((i) => ({
      url: i.url,
      alt: i.alt ?? product.title,
    })),
    related: related.map(toCardData),
  };
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export async function listBrands(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand!).filter(Boolean);
}
