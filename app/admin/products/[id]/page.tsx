import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageBackend } from "@/lib/storage";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const { id } = await params;
  const { saved } = await searchParams;
  const productId = Number(id);

  if (!Number.isInteger(productId)) notFound();

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: { position: "asc" } } },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      product={{
        id: product.id,
        title: product.title,
        sku: product.sku,
        brand: product.brand,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        condition: product.condition,
        specDisplay: product.specDisplay,
        specProcessor: product.specProcessor,
        specRam: product.specRam,
        specStorage: product.specStorage,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        categoryId: product.categoryId,
        images: product.images.map((i) => ({ id: i.id, url: i.url })),
      }}
      categories={categories}
      storageBackend={storageBackend()}
      saved={saved === "1"}
    />
  );
}
