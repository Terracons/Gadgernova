import { prisma } from "@/lib/prisma";

/** "HP EliteBook 830 | 16GB" → "hp-elitebook-830-16gb" */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // strip accents
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** Appends -2, -3 … until the product slug is free. */
export async function uniqueProductSlug(
  title: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let counter = 2;

  // Realistically resolves on the first or second try.
  for (;;) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

/** Same, for categories. */
export async function uniqueCategorySlug(
  name: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let counter = 2;

  for (;;) {
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${counter++}`;
  }
}
