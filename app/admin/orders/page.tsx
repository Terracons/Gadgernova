import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { updateOrderStatus } from "@/app/actions/admin";
import { PAID_STATUSES } from "@/lib/orders";
import type { OrderStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED",
];

type SearchParams = Promise<{ status?: string }>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const { status } = await searchParams;
  const where: Prisma.OrderWhereInput =
    status && STATUSES.includes(status as OrderStatus)
      ? { status: status as OrderStatus }
      : {};

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <div className="admin-topbar">
        <h1>Orders</h1>
        <form action="/admin/orders" className="a-row" style={{ gap: 8 }}>
          <select name="status" defaultValue={status ?? ""} style={{ width: "auto" }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
          <button className="a-btn ghost sm" type="submit">
            Filter
          </button>
        </form>
      </div>

      <div className="a-card" style={{ padding: 0 }}>
        {orders.length === 0 ? (
          <div className="a-empty">
            No orders{status ? " with that status" : " yet"}.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Placed</th>
                <th style={{ width: 190 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.reference}</strong>
                    {order.paidAt && (
                      <div className="a-muted" style={{ fontSize: 12 }}>
                        paid{" "}
                        {order.paidAt.toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </td>
                  <td>
                    {order.customerName}
                    <div className="a-muted" style={{ fontSize: 12 }}>
                      <a href={`tel:${order.customerPhone}`}>
                        {order.customerPhone}
                      </a>
                    </div>
                    <div className="a-muted" style={{ fontSize: 12 }}>
                      {order.customerEmail}
                    </div>
                  </td>
                  <td>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ fontSize: 13 }}>
                        {item.quantity} × {item.title}
                      </div>
                    ))}
                    <div
                      className="a-muted"
                      style={{ fontSize: 12, marginTop: 4 }}
                    >
                      {order.shippingAddress}
                      {order.city && `, ${order.city}`}
                      {order.state && `, ${order.state}`}
                    </div>
                    {order.note && (
                      <div
                        className="a-muted"
                        style={{ fontSize: 12, fontStyle: "italic" }}
                      >
                        “{order.note}”
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{formatMoney(order.total)}</strong>
                    <div className="a-muted" style={{ fontSize: 12 }}>
                      {formatMoney(order.subtotal)} +{" "}
                      {order.shippingFee === 0
                        ? "free ship"
                        : formatMoney(order.shippingFee)}
                    </div>
                  </td>
                  <td className="a-muted" style={{ fontSize: 13 }}>
                    {order.createdAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <div style={{ marginBottom: 6 }}>
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
                    </div>
                    <form action={updateOrderStatus} className="a-row" style={{ gap: 6 }}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <select
                        name="status"
                        defaultValue={order.status}
                        style={{ width: "auto" }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <button className="a-btn ghost sm" type="submit">
                        Update
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
