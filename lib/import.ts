import "server-only";

import { prisma } from "@/lib/prisma";
import { toKobo } from "@/lib/money";
import { uniqueCategorySlug, uniqueProductSlug } from "@/lib/slug";

/**
 * Bulk product import from CSV.
 *
 * Rows match on `sku` first, then `title`, so re-uploading an edited
 * spreadsheet updates existing products instead of duplicating them. Sellers
 * can keep one master file and re-import whenever prices change.
 */

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Minimal RFC-4180 CSV parser.
 *
 * Hand-written rather than a dependency because product descriptions routinely
 * contain commas and quotes ("Clean unit, 16"" screen"), and naive splitting
 * corrupts them silently — which would be discovered only after prices are wrong.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip BOM — Excel adds one and it corrupts the first header.
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      // Skip blank lines.
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  return rows;
}

function truthy(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return ["1", "true", "yes", "y", "on", "active"].includes(
    value.trim().toLowerCase(),
  );
}

export async function importProductsCsv(text: string): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const rows = parseCsv(text);
  if (rows.length < 2) {
    result.errors.push("The file is empty or has no data rows.");
    return result;
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of ["title", "price"]) {
    if (!headers.includes(required)) {
      result.errors.push(`Missing required column: ${required}`);
    }
  }
  if (result.errors.length > 0) return result;

  // Cache categories so a 200-row import doesn't do 200 lookups.
  const categoryCache = new Map<string, number>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });

    const title = row.title;
    if (!title) {
      result.skipped++;
      continue;
    }

    try {
      const price = toKobo(row.price || "0");
      const compareAtPrice = row.compare_at_price
        ? toKobo(row.compare_at_price)
        : null;

      let categoryId: number | null = null;
      const categoryName = row.category;
      if (categoryName) {
        const cacheKey = categoryName.toLowerCase();
        if (categoryCache.has(cacheKey)) {
          categoryId = categoryCache.get(cacheKey)!;
        } else {
          const existing = await prisma.category.findFirst({
            where: { name: categoryName },
          });
          const category =
            existing ??
            (await prisma.category.create({
              data: {
                name: categoryName,
                slug: await uniqueCategorySlug(categoryName),
              },
            }));
          categoryId = category.id;
          categoryCache.set(cacheKey, category.id);
        }
      }

      const fields = {
        title,
        sku: row.sku || null,
        brand: row.brand || null,
        description: row.description || null,
        price,
        compareAtPrice,
        stock: Math.max(0, Number(row.stock || 0) || 0),
        condition: row.condition || "Used",
        specDisplay: row.display || null,
        specProcessor: row.processor || null,
        specRam: row.ram || null,
        specStorage: row.storage || null,
        isActive: truthy(row.active, true),
        isFeatured: truthy(row.featured, false),
        categoryId,
      };

      const existing = row.sku
        ? await prisma.product.findFirst({ where: { sku: row.sku } })
        : await prisma.product.findFirst({ where: { title } });

      let productId: number;

      if (existing) {
        const slug =
          existing.title === title
            ? existing.slug
            : await uniqueProductSlug(title, existing.id);
        await prisma.product.update({
          where: { id: existing.id },
          data: { ...fields, slug },
        });
        productId = existing.id;
        result.updated++;
      } else {
        const created = await prisma.product.create({
          data: { ...fields, slug: await uniqueProductSlug(title) },
        });
        productId = created.id;
        result.created++;
      }

      // Remote image URLs are linked as-is, not copied into your bucket.
      if (row.image_url) {
        const already = await prisma.productImage.findFirst({
          where: { productId, url: row.image_url },
        });
        if (!already) {
          const count = await prisma.productImage.count({ where: { productId } });
          await prisma.productImage.create({
            data: {
              productId,
              url: row.image_url,
              alt: title,
              position: count,
            },
          });
        }
      }
    } catch (error) {
      result.skipped++;
      result.errors.push(
        `Row ${r + 1} (${title}): ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  return result;
}

export const SAMPLE_CSV = `title,price,compare_at_price,sku,brand,category,stock,condition,display,processor,ram,storage,description,image_url,active,featured
HP EliteBook 830 G7,415000,485000,HP-830-G7,HP,Laptops,3,USA Used,13.3-inch,Intel Core i5,16GB,256GB SSD,"Clean unit, backlit keyboard",,yes,yes
`;
