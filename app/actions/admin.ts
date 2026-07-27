"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  checkCredentials,
  createSession,
  destroySession,
  requireAdmin,
} from "@/lib/auth";
import { toKobo } from "@/lib/money";
import { deleteImage, saveImage, StorageError } from "@/lib/storage";
import { uniqueCategorySlug, uniqueProductSlug } from "@/lib/slug";
import { importProductsCsv } from "@/lib/import";
import type { OrderStatus } from "@prisma/client";

/**
 * Admin server actions.
 *
 * Every one calls requireAdmin() first. Guarding the page alone is not enough:
 * server actions are individually addressable HTTP endpoints, so an
 * unauthenticated caller could invoke them directly.
 */

export type ActionResult = { ok: boolean; message?: string };

// ── Auth ─────────────────────────────────────────────────────────────

export async function login(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!checkCredentials(username, password)) {
    return { ok: false, message: "Incorrect username or password" };
  }

  await createSession(username);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

// ── Products ─────────────────────────────────────────────────────────

export async function saveProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const idRaw = String(formData.get("productId") ?? "");
  const id = idRaw ? Number(idRaw) : null;
  const title = String(formData.get("title") ?? "").trim();

  if (!title) return { ok: false, message: "Title is required" };

  let price: number;
  let compareAtPrice: number | null;
  try {
    price = toKobo(String(formData.get("price") ?? "0"));
    const compareRaw = String(formData.get("compareAtPrice") ?? "").trim();
    compareAtPrice = compareRaw ? toKobo(compareRaw) : null;
  } catch {
    return { ok: false, message: "Enter prices as numbers, e.g. 415000" };
  }

  if (price < 0) return { ok: false, message: "Price cannot be negative" };

  const categoryRaw = String(formData.get("categoryId") ?? "");
  const data = {
    title,
    sku: String(formData.get("sku") ?? "").trim() || null,
    brand: String(formData.get("brand") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    price,
    compareAtPrice,
    stock: Math.max(0, Number(formData.get("stock") ?? 0) || 0),
    condition: String(formData.get("condition") ?? "Used").trim() || "Used",
    specDisplay: String(formData.get("specDisplay") ?? "").trim() || null,
    specProcessor: String(formData.get("specProcessor") ?? "").trim() || null,
    specRam: String(formData.get("specRam") ?? "").trim() || null,
    specStorage: String(formData.get("specStorage") ?? "").trim() || null,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    categoryId: categoryRaw ? Number(categoryRaw) : null,
  };

  let productId: number;

  if (id) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: "Product not found" };

    const slug =
      existing.title === title
        ? existing.slug
        : await uniqueProductSlug(title, id);

    await prisma.product.update({ where: { id }, data: { ...data, slug } });
    productId = id;
  } else {
    const created = await prisma.product.create({
      data: { ...data, slug: await uniqueProductSlug(title) },
    });
    productId = created.id;
  }

  // Image failures shouldn't discard the text edits, so they're collected
  // and reported instead of thrown.
  const problems: string[] = [];
  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const existingCount = await prisma.productImage.count({ where: { productId } });
  let position = existingCount;

  for (const file of files) {
    if (!file.name || file.size === 0) continue;
    try {
      const { url, key } = await saveImage(file);
      await prisma.productImage.create({
        data: { productId, url, storageKey: key, alt: title, position: position++ },
      });
    } catch (error) {
      // Surface the real reason (Blob/S3/disk errors) instead of a generic
      // "upload failed" — it's an admin-only page and the detail is diagnostic.
      const reason =
        error instanceof StorageError
          ? error.message
          : error instanceof Error
            ? error.message
            : "upload failed";
      problems.push(`${file.name}: ${reason}`);
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");

  if (problems.length > 0) {
    return {
      ok: true,
      message: `Saved, but some images failed — ${problems.join("; ")}`,
    };
  }

  redirect(`/admin/products/${productId}?saved=1`);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("productId"));
  if (!id) return;

  const images = await prisma.productImage.findMany({
    where: { productId: id },
    select: { storageKey: true },
  });

  await prisma.product.delete({ where: { id } });
  await Promise.all(images.map((i) => deleteImage(i.storageKey)));

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function deleteProductImage(formData: FormData): Promise<void> {
  await requireAdmin();
  const imageId = Number(formData.get("imageId"));
  if (!imageId) return;

  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteImage(image.storageKey);

  revalidatePath(`/admin/products/${image.productId}`);
  redirect(`/admin/products/${image.productId}`);
}

// ── Categories ───────────────────────────────────────────────────────

export async function saveCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Name is required" };

  await prisma.category.create({
    data: {
      name,
      slug: await uniqueCategorySlug(name),
      description: String(formData.get("description") ?? "").trim() || null,
      position: Number(formData.get("position") ?? 0) || 0,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  return { ok: true, message: `Added "${name}"` };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("categoryId"));
  if (!id) return;

  // Products are orphaned, not deleted — losing inventory because a category
  // was tidied up would be a nasty surprise.
  await prisma.product.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });
  await prisma.category.delete({ where: { id } });

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

// ── Orders ───────────────────────────────────────────────────────────

const VALID_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED",
];

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("orderId"));
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id || !VALID_STATUSES.includes(status)) return;

  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
  redirect("/admin/orders");
}

// ── CSV import ───────────────────────────────────────────────────────

export async function importCsv(
  _prev: unknown,
  formData: FormData,
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
} | null> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { created: 0, updated: 0, skipped: 0, errors: ["Choose a CSV file"] };
  }

  const text = await file.text();
  const result = await importProductsCsv(text);

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  return result;
}
