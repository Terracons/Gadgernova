# Store Template

A complete e-commerce store for phones, laptops and gadgets. One Next.js app —
storefront, admin panel and payments together.

**Runs on Vercel, Hostinger, or any VPS.** Same code, different environment
variables.

---

## What's included

- **Storefront** — home, shop with filters, product pages, cart, checkout
- **Admin panel** — dashboard, product manager with image upload, categories,
  orders, CSV bulk import
- **Paystack payments** — cards, bank transfer, USSD, with webhook confirmation
- **Order emails** — branded confirmation to the customer, alert to the owner
- **WhatsApp ordering** — for customers who'd rather talk first
- **SEO** — server-rendered pages, per-product metadata, Google rich-result markup
- **One-file rebranding** — name, colours, contact details, shipping rules

---

## Quick start (10 minutes)

You need **Node 18.18+** and a **MySQL database**.

```bash
npm install
cp .env.example .env        # then edit .env — at minimum DATABASE_URL
npm run setup               # creates tables + demo products
npm run dev
```

- Storefront → http://localhost:3000
- Admin → http://localhost:3000/admin

Sign in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` from your `.env`.

---

## Rebranding — edit one file

Open **`store.config.ts`**. Everything a new shop needs is there:

```ts
name: "GadgetNova",
tagline: "Phones | Laptops | Gadgets",
colors: {
  primary: "#0266fc",     // buttons, links
  dark:    "#0b193c",     // header, footer, headings
},
contact: { email: "...", whatsapp: "234..." },
shipping: { freeAbove: 200_000, flatFee: 5_000 },
```

Colours become CSS variables automatically, so changing `primary` restyles the
entire site *and* the admin panel. Drop a logo in `public/` and point `logo` at it.

No other file needs editing to launch a different brand.

---

## Adding products

**One at a time** — Admin → Products → New product. Attach images; anything over
1600px is resized and converted to WebP automatically.

**In bulk** — Admin → Bulk import. Download the sample CSV, fill it in, upload.

Rows match on `sku` first, then `title`, so **re-uploading an edited file updates
existing products instead of duplicating them**. Keep one master spreadsheet and
re-import whenever prices change.

Prices are entered in plain naira (`415000` or `415,000.00`). Internally
everything is stored in kobo as whole numbers — no rounding drift, and it's what
Paystack expects.

---

## Deploying

### Option A — Vercel

Good for demos and for clients who want zero server management.

1. Push to GitHub, then import the repo at vercel.com
2. Add a MySQL database — **PlanetScale** has a free tier and is built for
   serverless. Set `DATABASE_URL`.
3. **Set up R2 or S3 — this is not optional on Vercel.** Vercel's filesystem is
   wiped on every deploy, so locally-uploaded images would vanish. Cloudflare R2
   gives 10 GB free with no egress charges.
4. Add the remaining environment variables from `.env.example`
5. Deploy, then run `npx prisma db push` against your production database

> **Note on Vercel's free tier:** Hobby is for non-commercial use only. A store
> selling products needs Vercel Pro ($20/mo).

### Option B — Hostinger (or any shared host with Node.js)

Cheaper, and no commercial-use restriction.

Requires a plan that lists **Node.js** support — the entry-level tiers don't
have it.

1. hPanel → Databases → create a MySQL database, note the credentials
2. hPanel → Advanced → Node.js → create an application
3. Upload the project (Git deploy or File Manager)
4. Set environment variables in the Node.js app settings
5. Run in the app's terminal:
   ```bash
   npm install
   npx prisma db push
   npm run build
   ```
6. Set the start command to `npm start`

Leave the `S3_*` variables blank and images are stored in `public/uploads` on
the server's disk, which persists fine here.

### Option C — VPS

Any $5–12/mo VPS. Install Node and MySQL, run `npm run build && npm start`
behind nginx, use `pm2` or systemd to keep it alive. No filesystem or
commercial-use limits.

---

## Payments

Add your keys from Paystack → Settings → API Keys & Webhooks:

```
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_PUBLIC_KEY="pk_live_..."
```

Then register the webhook URL in the same screen:

```
https://your-domain.com/api/paystack/webhook
```

**The webhook is what confirms payment**, not the browser redirect — a customer
who closes the tab mid-payment still gets their order marked paid, and a forged
visit to the success page proves nothing. The success page also verifies
directly with Paystack as a fallback if the webhook is delayed.

**Without Paystack keys the store still works.** Orders are recorded as pending
and the owner arranges payment by transfer or WhatsApp. Many sellers start this
way and add the gateway later.

---

## Order emails

Two emails go out per order — a branded confirmation to the customer, and an
alert to the shop owner with the buyer's phone number, WhatsApp link and
delivery address.

Setup takes about five minutes and is free up to 3,000 emails/month:

1. Sign up at [resend.com](https://resend.com)
2. Add your domain and create the DNS records it shows you
3. API Keys → create one

```
RESEND_API_KEY="re_..."
EMAIL_FROM="Your Store <orders@yourdomain.com>"
OWNER_EMAIL="you@yourdomain.com"     # optional; defaults to store.config.ts
```

`EMAIL_FROM` **must** be on a domain verified with Resend. A Gmail or Yahoo
address will be rejected.

Details worth knowing:

- **Emails fire exactly once per order.** They're triggered by the
  PENDING → PAID transition, which is guarded, so a webhook delivered twice
  won't send two confirmations.
- **Unpaid orders get emails too**, when Paystack isn't configured — the
  customer receives a receipt, the owner gets a number to call.
- **Email failures never break an order.** If Resend is down the payment still
  completes; the failure is logged and nothing is lost.
- **Replies are routed usefully** — the customer's reply reaches the shop, the
  owner's reply reaches the customer.
- Templates use table-based HTML with inline styles, because Gmail and Outlook
  strip `<style>` blocks. Colours come from `store.config.ts`, so a rebrand
  carries into emails automatically.

Leave the variables blank and the store behaves exactly as before, minus emails.
The admin dashboard shows a reminder when they're off.

---

## How it's built

```
app/
  page.tsx                    Home
  shop/                       Listing with filters
  product/[slug]/             Product detail + JSON-LD
  cart/  checkout/            Cart and checkout
  order/[reference]/          Order status
  admin/                      Admin panel (login, products, orders, import)
  actions/                    Server actions — cart, checkout, admin
  api/paystack/webhook/       Payment confirmation

lib/
  prisma.ts       Database client singleton
  quote.ts        Server-side cart pricing  ← security-critical
  money.ts        Kobo/naira conversion
  auth.ts         Admin session (scrypt + signed cookie)
  storage.ts      Image upload (S3/R2 or local disk)
  paystack.ts     Payment API + signature verification
  orders.ts       Payment confirmation, stock decrement
  import.ts       CSV parser and bulk import
  products.ts     Product queries
  email/
    send.ts       Resend delivery, never throws
    templates.ts  Customer + owner HTML templates

store.config.ts   ← branding lives here
prisma/schema.prisma
```

---

## Security notes

Worth understanding before you sell this to someone.

- **Prices are never trusted from the browser.** The cart stores only product
  IDs and quantities; every price is re-read from the database at checkout
  (`lib/quote.ts`). Editing localStorage changes nothing.
- **Webhook signatures are verified** with HMAC-SHA512 against the raw request
  body, and the amount is checked against the order total before anything is
  marked paid.
- **Stock decrements on payment confirmation**, inside a transaction, clamped so
  two orders racing for the last unit can't push it negative.
- **Uploads are validated by magic bytes**, not file extension — renaming
  `shell.php` to `photo.jpg` is rejected.
- **Every admin server action re-checks the session.** Guarding the page alone
  isn't enough: server actions are individually addressable endpoints.
- **Order references are random**, not sequential, so customers can't enumerate
  each other's orders.

Before going live: set a long random `SESSION_SECRET`, change `ADMIN_PASSWORD`,
and prefer `ADMIN_PASSWORD_HASH`.

---

## Things you may want to add

Deliberately left out to keep the template lean:

- **Discount codes**
- **Multiple admin users** — currently one account from environment variables
- **Analytics** — Vercel Analytics or Plausible
- **Error tracking** — Sentry's free tier

---

## Troubleshooting

**`Can't reach database server`** — check `DATABASE_URL`. On shared hosting the
host is usually `localhost`, not a remote address.

**Images upload but don't appear on Vercel** — you're on local storage. Vercel
needs R2/S3; see Option A above.

**`SESSION_SECRET is missing or too short`** — set it in `.env`, at least 16
characters.

**Admin login rejects a correct password** — if `ADMIN_PASSWORD_HASH` is set it
takes priority and `ADMIN_PASSWORD` is ignored.

**Sharp fails to install on shared hosting** — it's optional. Uploads still work,
they just aren't resized.

**Emails aren't sending** — check the server logs for `[email]`. The usual cause
is `EMAIL_FROM` using a domain not verified with Resend. Both variables must be
set; either one alone disables email.
