import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageBackend } from "@/lib/storage";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ProductForm
      product={null}
      categories={categories}
      storageBackend={storageBackend()}
    />
  );
}
