/**
 * Demo catalogue.
 *
 *   npm run db:seed
 *
 * Safe to re-run: products are matched on SKU, so it updates rather than
 * duplicating. Ships with the template so a buyer sees a working store on
 * first boot instead of an empty page.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

const CATEGORIES = [
  { name: "Laptops", description: "Business and student laptops, tested and warrantied.", position: 1 },
  { name: "Phones & Tablets", description: "iPhones, Android phones and tablets.", position: 2 },
  { name: "Desktops", description: "Towers and all-in-ones for home and office.", position: 3 },
  { name: "Gadgets", description: "Smart wearables, audio and accessories.", position: 4 },
  { name: "Components", description: "SSDs, RAM and internal upgrades.", position: 5 },
];

interface SeedProduct {
  title: string;
  sku: string;
  brand: string;
  category: string;
  price: number; // naira
  compareAt?: number;
  stock: number;
  display?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  featured?: boolean;
  description?: string;
}

const PRODUCTS: SeedProduct[] = [
  {
    title: "HP EliteBook 830 G7 | 10th Gen Core i5 | 16GB RAM | 256GB SSD",
    sku: "HP-830-G7", brand: "HP", category: "Laptops",
    price: 415_000, compareAt: 485_000, stock: 4,
    display: "13.3-inch", processor: "Intel Core i5", ram: "16GB", storage: "256GB SSD",
    featured: true,
    description: "Clean unit with backlit keyboard. Battery health above 85%. Comes with charger and 30-day warranty.",
  },
  {
    title: "Apple MacBook Pro 14-inch (2021) | M1 Pro | 16GB | 512GB SSD",
    sku: "APL-MBP14-M1P", brand: "Apple", category: "Laptops",
    price: 1_265_000, compareAt: 1_640_000, stock: 2,
    display: "14-inch", processor: "Apple M1 Pro", ram: "16GB", storage: "512GB SSD",
    featured: true,
    description: "Excellent condition. Touch ID, backlit keyboard, original charger included.",
  },
  {
    title: "HP ProBook 635 Aero G8 | AMD Ryzen 5 | 16GB RAM | 256GB SSD",
    sku: "HP-635-AERO", brand: "HP", category: "Laptops",
    price: 320_000, compareAt: 380_000, stock: 3,
    display: "13.3-inch", processor: "AMD Ryzen 5", ram: "16GB", storage: "256GB SSD",
    description: "Lightweight magnesium body — under 1kg. Great for daily commuting.",
  },
  {
    title: "Lenovo 100e 2nd Gen | AMD 3015e | 4GB RAM | 64GB eMMC",
    sku: "LEN-100E-G2", brand: "Lenovo", category: "Laptops",
    price: 98_500, stock: 6,
    display: "11.6-inch", processor: "AMD 3015e", ram: "4GB", storage: "64GB eMMC",
    description: "Rugged student laptop. Ideal for schoolwork and browsing.",
  },
  {
    title: "Dell Chromebook 3100 | Intel Celeron | 4GB RAM | 16GB eMMC",
    sku: "DEL-CB-3100", brand: "Dell", category: "Laptops",
    price: 65_000, stock: 8,
    display: "11.6-inch", processor: "Intel Celeron", ram: "4GB", storage: "16GB eMMC",
  },
  {
    title: "Apple iPhone 14 Pro Max | 256GB",
    sku: "APL-IP14PM-256", brand: "Apple", category: "Phones & Tablets",
    price: 850_000, stock: 2,
    display: "6.7-inch", processor: "A16 Bionic", ram: "6GB", storage: "256GB",
    featured: true,
    description: "Battery health 91%. Face ID working perfectly. Minor scuffs on frame.",
  },
  {
    title: "Apple iPhone 6s Plus | 128GB | Grey",
    sku: "APL-IP6SP-128", brand: "Apple", category: "Phones & Tablets",
    price: 90_000, stock: 3,
    display: "5.5-inch", processor: "A9", ram: "2GB", storage: "128GB",
  },
  {
    title: "Lenovo ThinkCentre M820z All-in-One | Core i5 | 16GB | 256GB SSD",
    sku: "LEN-M820Z", brand: "Lenovo", category: "Desktops",
    price: 498_000, stock: 1,
    display: "21.5-inch", processor: "Intel Core i5", ram: "16GB", storage: "256GB SSD",
    description: "Space-saving all-in-one. Perfect for a front desk or small office.",
  },
  {
    title: "AI Smart Glasses | HD Camera | Real-Time Translation",
    sku: "AIMB-S1", brand: "AIMB", category: "Gadgets",
    price: 55_000, stock: 10, featured: true,
    description: "Open-ear audio, HD camera and live translation. USB-C charging case included.",
  },
  {
    title: "Lenovo ThinkPlus XT56 True Wireless Earbuds",
    sku: "LEN-XT56", brand: "Lenovo", category: "Gadgets",
    price: 22_000, stock: 15,
  },
  {
    title: "Western Digital NVMe M.2 SSD | 512GB",
    sku: "WD-NVME-512", brand: "WD", category: "Components",
    price: 95_000, stock: 12, storage: "512GB SSD",
  },
  {
    title: "SK hynix SSD | 512GB",
    sku: "SKH-SSD-512", brand: "SK hynix", category: "Components",
    price: 95_000, stock: 7, storage: "512GB SSD",
  },
];

async function main() {
  console.log("Seeding demo catalogue…\n");

  const categoryIds = new Map<string, number>();

  for (const definition of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(definition.name) },
      update: { description: definition.description, position: definition.position },
      create: {
        name: definition.name,
        slug: slugify(definition.name),
        description: definition.description,
        position: definition.position,
      },
    });
    categoryIds.set(definition.name, category.id);
  }
  console.log(`  ${CATEGORIES.length} categories ready`);

  let created = 0;
  let updated = 0;

  for (const item of PRODUCTS) {
    const data = {
      title: item.title,
      sku: item.sku,
      brand: item.brand,
      description: item.description ?? null,
      price: item.price * 100,
      compareAtPrice: item.compareAt ? item.compareAt * 100 : null,
      stock: item.stock,
      condition: "USA Used",
      specDisplay: item.display ?? null,
      specProcessor: item.processor ?? null,
      specRam: item.ram ?? null,
      specStorage: item.storage ?? null,
      isActive: true,
      isFeatured: item.featured ?? false,
      categoryId: categoryIds.get(item.category) ?? null,
    };

    const existing = await prisma.product.findFirst({ where: { sku: item.sku } });

    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({
        data: { ...data, slug: slugify(item.title) },
      });
      created++;
    }
  }

  console.log(`  ${created} products created, ${updated} updated\n`);
  console.log("Done. Seeded products have no images — add them from /admin.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
