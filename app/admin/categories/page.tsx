import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCategory } from "@/app/actions/admin";
import CategoryForm from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <div className="admin-topbar">
        <h1>Categories</h1>
      </div>

      <div className="a-grid a-grid-2" style={{ alignItems: "start" }}>
        <div className="a-card" style={{ padding: 0 }}>
          {categories.length === 0 ? (
            <div className="a-empty">
              No categories yet. Add one on the right.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Products</th>
                  <th>Order</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                      <div className="a-muted" style={{ fontSize: 12 }}>
                        /{category.slug}
                      </div>
                    </td>
                    <td>{category._count.products}</td>
                    <td>{category.position}</td>
                    <td>
                      <form action={deleteCategory}>
                        <input
                          type="hidden"
                          name="categoryId"
                          value={category.id}
                        />
                        <button className="a-btn danger sm" type="submit">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <CategoryForm />
      </div>
    </>
  );
}
