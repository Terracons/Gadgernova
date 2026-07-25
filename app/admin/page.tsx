import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { storageBackend } from "@/lib/storage";
import { paystackEnabled } from "@/lib/paystack";
import { emailEnabled } from "@/lib/email/send";
import { PAID_STATUSES } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();

  const [
    products,
    activeProducts,
    outOfStock,
    orders,
    paidOrders,
    revenue,
    recentOrders,
    lowStock,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: PAID_STATUSES } } }),
    prisma.order.aggregate({
      where: { status: { in: PAID_STATUSES } },
      _sum: { total: true },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: 2 } },
      orderBy: { stock: "asc" },
      take: 8,
    }),
  ]);

  return (
    <>
      <div className="admin-topbar">
        <h1>Dashboard</h1>
        <div className="a-row">
          <span className="a-muted" style={{ fontSize: 13 }}>
            Images: {storageBackend()}
          </span>
          <Link className="a-btn" href="/admin/products/new">
            + New product
          </Link>
        </div>
      </div>

      {!paystackEnabled() && (
        <div className="a-alert info">
          Payments aren&apos;t configured yet — orders are recorded as pending so
          you can arrange bank transfer or WhatsApp payment. Add{" "}
          <code>PAYSTACK_SECRET_KEY</code> to accept cards online.
        </div>
      )}

      {!emailEnabled() && (
        <div className="a-alert info">
          Order emails are off — customers won&apos;t get a confirmation and you
          won&apos;t be alerted about new orders. Add <code>RESEND_API_KEY</code>{" "}
          and <code>EMAIL_FROM</code> to switch them on.
        </div>
      )}

      <div className="a-grid a-grid-4" style={{ marginBottom: 22 }}>
        <div className="a-card a-stat" style={{ margin: 0 }}>
          <div className="label">Products</div>
          <div className="value">{products}</div>
          <div className="a-muted" style={{ fontSize: 13 }}>
            {activeProducts} visible
          </div>
        </div>
        <div className="a-card a-stat" style={{ margin: 0 }}>
          <div className="label">Out of stock</div>
          <div className="value">{outOfStock}</div>
          <div className="a-muted" style={{ fontSize: 13 }}>
            needs restocking
          </div>
        </div>
        <div className="a-card a-stat" style={{ margin: 0 }}>
          <div className="label">Orders</div>
          <div className="value">{orders}</div>
          <div className="a-muted" style={{ fontSize: 13 }}>
            {paidOrders} confirmed
          </div>
        </div>
        <div className="a-card a-stat" style={{ margin: 0 }}>
          <div className="label">Revenue</div>
          <div className="value">{formatMoney(revenue._sum.total ?? 0)}</div>
          <div className="a-muted" style={{ fontSize: 13 }}>
            paid orders only
          </div>
        </div>
      </div>

      <div className="a-grid a-grid-2">
        <div className="a-card">
          <h2>Recent orders</h2>
          {recentOrders.length === 0 ? (
            <div className="a-empty">No orders yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href="/admin/orders">{order.reference}</Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td>{formatMoney(order.total)}</td>
                    <td>
                      <span
                        className={`pill ${
                          PAID_STATUSES.includes(order.status)
                            ? "good"
                            : order.status === "PENDING"
                              ? "warn"
                              : "bad"
                        }`}
                      >
                        {order.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="a-card">
          <h2>Low stock</h2>
          {lowStock.length === 0 ? (
            <div className="a-empty">Stock levels look healthy.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Left</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link href={`/admin/products/${product.id}`}>
                        {product.title}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={`pill ${product.stock === 0 ? "bad" : "warn"}`}
                      >
                        {product.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
