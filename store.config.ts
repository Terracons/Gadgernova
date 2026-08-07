/**
 * ═══════════════════════════════════════════════════════════════
 *  STORE CONFIGURATION — edit this file to rebrand the whole shop
 * ═══════════════════════════════════════════════════════════════
 *
 * Everything a new owner needs to change lives here: name, colours,
 * contact details, shipping rules and copy. No other file needs editing
 * to launch a different brand.
 *
 * Colours are also injected as CSS variables, so changing them here
 * restyles the entire storefront and admin.
 */

export const store = {
  // ── Identity ──────────────────────────────────────────────────
  name: "GadgetNova",
  // Shown next to the name; also used in the footer.
  tagline: "Phones, laptops & gadgets you can trust",
  // Used for page titles and SEO.
  description:
    "Quality phones, laptops and gadgets at honest prices — every device tested, cleaned up and backed by warranty, then delivered to your door anywhere in Nigeria. Real people, real support, no wahala.",

  // Put your logo in /public and reference it here. Leave "" for text only.
  logo: "/logo.jpg",

  // ── Brand colours ─────────────────────────────────────────────
  // Any valid CSS colour. These drive the entire theme.
  colors: {
    primary: "#0266fc", // buttons, links, accents
    primaryDark: "#014bde", // hover states
    dark: "#0b193c", // headings, header bar, footer
    sale: "#d92d20", // discount badges
    success: "#067647", // in-stock, confirmations
  },

  // ── Contact ───────────────────────────────────────────────────
  contact: {
    email: "novagadget9@gmail.com",
    // International format, no spaces — used for WhatsApp links.
    whatsapp: "2348152546360",
    phoneDisplay: "+234 815 254 6360",
    address: "Lagos, Nigeria",
  },

  social: {
    facebook: "",
    instagram: "https://www.instagram.com/gadgetnova__store?igsh=MTlwZHNiM3N0c2Fibw==",
    twitter: "",
    tiktok: "https://www.tiktok.com/@gadgetnova_store",
  },

  // ── Money ─────────────────────────────────────────────────────
  currency: {
    code: "NGN",
    symbol: "₦",
    // Where the symbol sits relative to the number.
    position: "before" as "before" | "after",
  },

  // ── Shipping ──────────────────────────────────────────────────
  // Plain naira, not kobo — this file is meant to be human-editable.
  shipping: {
    freeAbove: 200_000, // free delivery at or above this order value
    flatFee: 5_000, // charged below the threshold
  },

  // ── Storefront copy ───────────────────────────────────────────
  copy: {
    announcement: "Free delivery nationwide on orders over ₦200,000 — our treat 🎉",
    heroHeading: "Quality tech. Honest prices. Real people.",
    heroSubheading:
      "Every device is tested, cleaned up and backed by warranty, then delivered to your door anywhere in Nigeria. Got a question first? We're one WhatsApp message away.",
    warranty: "Every device backed by a 30-day warranty",
  },

  // ── Behaviour ─────────────────────────────────────────────────
  options: {
    // Maximum units of one product per order.
    maxQuantityPerItem: 10,
    // Products per page in the shop.
    productsPerPage: 24,
    // Show an "Order on WhatsApp" button on product pages. Many Nigerian
    // buyers prefer talking to a human before a large purchase.
    enableWhatsAppOrder: true,
    // Show the condition badge (Used / Refurbished / Brand New).
    showCondition: true,
  },

  // ── Product condition options offered in the admin ────────────
  conditions: ["Brand New", "USA Used", "UK Used", "Refurbished"],
} as const;

export type StoreConfig = typeof store;

/** Naira value of the free-shipping threshold, in kobo. */
export const freeShippingThresholdKobo = store.shipping.freeAbove * 100;

/** Flat shipping fee, in kobo. */
export const flatShippingFeeKobo = store.shipping.flatFee * 100;
