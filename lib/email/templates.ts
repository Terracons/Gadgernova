import { formatMoney } from "@/lib/money";
import { store } from "@/store.config";

/**
 * Email HTML.
 *
 * Deliberately old-fashioned markup: tables, inline styles, no flexbox or grid.
 * Gmail, Outlook and most Nigerian webmail clients strip <style> blocks and
 * ignore modern CSS, so anything cleverer renders as an unstyled mess.
 *
 * Colours come from store.config.ts, so a rebrand carries into emails too.
 */

export interface EmailOrder {
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string | null;
  state: string | null;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  items: { title: string; quantity: number; unitPrice: number }[];
}

/** Escape anything that came from a customer before it enters HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function itemRows(order: EmailOrder): string {
  return order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e7f0;font-size:14px;color:#0b193c;">
            ${escapeHtml(item.title)}<br>
            <span style="color:#5f6b85;font-size:13px;">
              ${item.quantity} × ${formatMoney(item.unitPrice)}
            </span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e7f0;font-size:14px;color:#0b193c;text-align:right;white-space:nowrap;">
            ${formatMoney(item.unitPrice * item.quantity)}
          </td>
        </tr>`,
    )
    .join("");
}

function totalsBlock(order: EmailOrder): string {
  return `
    <tr>
      <td style="padding:10px 0 4px;font-size:14px;color:#5f6b85;">Subtotal</td>
      <td style="padding:10px 0 4px;font-size:14px;color:#0b193c;text-align:right;">
        ${formatMoney(order.subtotal)}
      </td>
    </tr>
    <tr>
      <td style="padding:4px 0;font-size:14px;color:#5f6b85;">Delivery</td>
      <td style="padding:4px 0;font-size:14px;text-align:right;color:${
        order.shippingFee === 0 ? "#067647" : "#0b193c"
      };">
        ${order.shippingFee === 0 ? "Free" : formatMoney(order.shippingFee)}
      </td>
    </tr>
    <tr>
      <td style="padding:12px 0 0;border-top:2px solid #0b193c;font-size:16px;font-weight:bold;color:#0b193c;">
        Total
      </td>
      <td style="padding:12px 0 0;border-top:2px solid #0b193c;font-size:16px;font-weight:bold;color:#0b193c;text-align:right;">
        ${formatMoney(order.total)}
      </td>
    </tr>`;
}

function shell(bodyHtml: string, preheader: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(store.name)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- Preview text shown in the inbox list, hidden in the body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">

          <tr>
            <td style="background:${store.colors.dark};padding:22px 28px;">
              <div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:-0.3px;">
                ${escapeHtml(store.name)}
              </div>
              <div style="color:${store.colors.primary};font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-top:3px;">
                ${escapeHtml(store.tagline)}
              </div>
            </td>
          </tr>

          <tr><td style="padding:28px;">${bodyHtml}</td></tr>

          <tr>
            <td style="background:#f5f7fb;padding:20px 28px;border-top:1px solid #e2e7f0;">
              <p style="margin:0 0 6px;font-size:13px;color:#5f6b85;">
                Questions? Reply to this email${
                  store.contact.phoneDisplay
                    ? ` or call ${escapeHtml(store.contact.phoneDisplay)}`
                    : ""
                }.
              </p>
              <p style="margin:0;font-size:12px;color:#8b96ad;">
                © ${new Date().getFullYear()} ${escapeHtml(store.name)}${
                  store.contact.address ? ` · ${escapeHtml(store.contact.address)}` : ""
                }
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Customer: order confirmation ─────────────────────────────────────

export function customerOrderEmail(
  order: EmailOrder,
  paid: boolean,
): { subject: string; html: string; text: string } {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const heading = paid
    ? "Thank you — your payment is confirmed"
    : "We've received your order";

  const intro = paid
    ? "We're preparing your order now and will be in touch about delivery."
    : "We'll contact you shortly to arrange payment and delivery.";

  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#0b193c;letter-spacing:-0.3px;">
      ${heading}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#5f6b85;line-height:1.55;">
      Hi ${escapeHtml(order.customerName.split(" ")[0])}, ${intro}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;border-radius:8px;padding:14px;margin-bottom:22px;">
      <tr>
        <td style="font-size:13px;color:#5f6b85;">Order reference</td>
      </tr>
      <tr>
        <td style="font-size:17px;font-weight:bold;color:#0b193c;letter-spacing:0.5px;">
          ${escapeHtml(order.reference)}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(order)}
      ${totalsBlock(order)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">
      <tr>
        <td style="font-size:13px;font-weight:bold;color:#0b193c;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;">
          Delivering to
        </td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#5f6b85;line-height:1.6;">
          ${escapeHtml(order.customerName)}<br>
          ${escapeHtml(order.shippingAddress).replace(/\n/g, "<br>")}
          ${order.city ? `<br>${escapeHtml(order.city)}` : ""}${
            order.state ? `, ${escapeHtml(order.state)}` : ""
          }<br>
          ${escapeHtml(order.customerPhone)}
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
      <tr>
        <td style="background:${store.colors.primary};border-radius:8px;">
          <a href="${siteUrl}/order/${encodeURIComponent(order.reference)}"
             style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
            View your order
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:22px 0 0;font-size:13px;color:#8b96ad;line-height:1.55;">
      Keep this reference handy — quote it if you contact us about this order.
      ${store.copy.warranty ? `All items include a ${escapeHtml(store.copy.warranty)}.` : ""}
    </p>`;

  const text = [
    heading,
    "",
    `Hi ${order.customerName.split(" ")[0]}, ${intro}`,
    "",
    `Order reference: ${order.reference}`,
    "",
    ...order.items.map(
      (i) => `  ${i.quantity} x ${i.title} — ${formatMoney(i.unitPrice * i.quantity)}`,
    ),
    "",
    `Subtotal: ${formatMoney(order.subtotal)}`,
    `Delivery: ${order.shippingFee === 0 ? "Free" : formatMoney(order.shippingFee)}`,
    `Total:    ${formatMoney(order.total)}`,
    "",
    "Delivering to:",
    `  ${order.customerName}`,
    `  ${order.shippingAddress}`,
    order.city || order.state
      ? `  ${[order.city, order.state].filter(Boolean).join(", ")}`
      : "",
    `  ${order.customerPhone}`,
    "",
    `View your order: ${siteUrl}/order/${order.reference}`,
    "",
    `— ${store.name}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: `${paid ? "Order confirmed" : "Order received"} — ${order.reference}`,
    html: shell(body, `${order.reference} · ${formatMoney(order.total)}`),
    text,
  };
}

// ── Owner: new order alert ───────────────────────────────────────────

export function ownerOrderEmail(
  order: EmailOrder,
  paid: boolean,
): { subject: string; html: string; text: string } {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const whatsappLink = order.customerPhone
    ? `https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "").replace(/^0/, "234")}`
    : null;

  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#0b193c;letter-spacing:-0.3px;">
      ${paid ? "💰 New paid order" : "🔔 New order (unpaid)"}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#5f6b85;">
      ${escapeHtml(order.customerName)} — ${formatMoney(order.total)}
      ${paid ? "" : " · awaiting payment"}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(order)}
      ${totalsBlock(order)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#f5f7fb;border-radius:8px;">
      <tr>
        <td style="padding:14px;font-size:14px;color:#0b193c;line-height:1.7;">
          <strong>${escapeHtml(order.customerName)}</strong><br>
          <a href="tel:${escapeHtml(order.customerPhone)}" style="color:${store.colors.primary};text-decoration:none;">
            ${escapeHtml(order.customerPhone)}
          </a>
          ${whatsappLink ? ` · <a href="${whatsappLink}" style="color:#25d366;text-decoration:none;">WhatsApp</a>` : ""}
          <br>
          <a href="mailto:${escapeHtml(order.customerEmail)}" style="color:${store.colors.primary};text-decoration:none;">
            ${escapeHtml(order.customerEmail)}
          </a><br><br>
          ${escapeHtml(order.shippingAddress).replace(/\n/g, "<br>")}
          ${order.city ? `<br>${escapeHtml(order.city)}` : ""}${
            order.state ? `, ${escapeHtml(order.state)}` : ""
          }
          ${
            order.note
              ? `<br><br><em style="color:#5f6b85;">Note: ${escapeHtml(order.note)}</em>`
              : ""
          }
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr>
        <td style="background:${store.colors.dark};border-radius:8px;">
          <a href="${siteUrl}/admin/orders"
             style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
            Open in admin
          </a>
        </td>
      </tr>
    </table>`;

  const text = [
    paid ? "NEW PAID ORDER" : "NEW ORDER (unpaid)",
    "",
    `Reference: ${order.reference}`,
    `Total:     ${formatMoney(order.total)}`,
    "",
    ...order.items.map((i) => `  ${i.quantity} x ${i.title}`),
    "",
    `Customer: ${order.customerName}`,
    `Phone:    ${order.customerPhone}`,
    `Email:    ${order.customerEmail}`,
    `Address:  ${order.shippingAddress}`,
    order.note ? `Note:     ${order.note}` : "",
    "",
    `Admin: ${siteUrl}/admin/orders`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: `${paid ? "Paid order" : "New order"} ${order.reference} — ${formatMoney(order.total)}`,
    html: shell(body, `${order.customerName} · ${formatMoney(order.total)}`),
    text,
  };
}
