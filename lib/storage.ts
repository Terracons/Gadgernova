import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Pluggable image storage.
 *
 *   S3-compatible (Cloudflare R2, Backblaze, AWS)  — required on Vercel
 *   Local disk                                     — fine on Hostinger/VPS
 *
 * Which one runs is decided by whether the S3_* variables are set, so the same
 * codebase deploys to both without edits.
 *
 * Vercel's filesystem is ephemeral: files written at runtime vanish on the next
 * deploy and aren't shared between instances. If you deploy to Vercel you MUST
 * configure R2 or another S3 bucket.
 */

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_WIDTH = 1600;

// Magic-byte signatures. The filename is not trusted — renaming shell.php to
// photo.jpg must not get past this.
const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: ".jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: ".png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: ".webp",
    test: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  { ext: ".gif", test: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
  {
    ext: ".avif",
    test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp",
  },
];

export class StorageError extends Error {}

export interface StoredImage {
  url: string;
  key: string;
}

// ── Backend detection ────────────────────────────────────────────────

function s3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET &&
      process.env.S3_PUBLIC_URL,
  );
}

export function storageBackend(): string {
  return s3Configured() ? "Cloudflare R2 / S3" : "local disk";
}

// ── Validation and optimisation ──────────────────────────────────────

function detectExtension(buffer: Buffer): string {
  if (buffer.length < 12) {
    throw new StorageError("That file is too small to be an image");
  }
  const match = SIGNATURES.find((s) => s.test(buffer));
  if (!match) {
    throw new StorageError(
      "That file isn't a supported image (JPG, PNG, WebP, GIF or AVIF)",
    );
  }
  return match.ext;
}

/**
 * Downscale oversized images and re-encode.
 *
 * R2 egress is free but the customer's data bundle is not — most shoppers are
 * on mobile. Falls back to the original bytes if sharp isn't available, which
 * happens on some shared hosts where the native binary won't install.
 */
async function optimize(
  buffer: Buffer,
  ext: string,
): Promise<{ data: Buffer; ext: string }> {
  if (ext === ".gif") return { data: buffer, ext }; // don't kill animation

  try {
    const { default: sharp } = await import("sharp");
    const image = sharp(buffer, { failOn: "none" });
    const meta = await image.metadata();

    if ((meta.width ?? 0) <= MAX_WIDTH && buffer.length < 300_000) {
      return { data: buffer, ext };
    }

    const pipeline = image.rotate(); // honour EXIF orientation
    if ((meta.width ?? 0) > MAX_WIDTH) {
      pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }

    // Re-encode everything to WebP: smaller than JPEG at the same quality and
    // supported by every browser a customer will realistically use.
    const data = await pipeline.webp({ quality: 82 }).toBuffer();
    return { data, ext: ".webp" };
  } catch {
    return { data: buffer, ext };
  }
}

function buildKey(ext: string): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `products/${stamp}/${randomUUID()}${ext}`;
}

// ── S3 / R2 ──────────────────────────────────────────────────────────

async function s3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

async function saveToS3(data: Buffer, key: string): Promise<string> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await s3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: data,
      ContentType: CONTENT_TYPES[path.extname(key)] ?? "application/octet-stream",
      // Keys contain a UUID, so contents never change — cache hard.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
}

async function deleteFromS3(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await s3Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
  );
}

// ── Local disk ───────────────────────────────────────────────────────

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

async function saveToDisk(data: Buffer, key: string): Promise<string> {
  const target = path.join(UPLOAD_ROOT, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return `/uploads/${key}`;
}

async function deleteFromDisk(key: string): Promise<void> {
  await unlink(path.join(UPLOAD_ROOT, key));
}

// ── Public API ───────────────────────────────────────────────────────

export async function saveImage(file: File): Promise<StoredImage> {
  if (file.size === 0) throw new StorageError("That file is empty");
  if (file.size > MAX_BYTES) {
    throw new StorageError(
      `Image is too large (${(file.size / 1_048_576).toFixed(1)} MB). Maximum is 12 MB.`,
    );
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const detected = detectExtension(raw);
  const { data, ext } = await optimize(raw, detected);
  const key = buildKey(ext);

  const url = s3Configured() ? await saveToS3(data, key) : await saveToDisk(data, key);
  return { url, key };
}

/** Best-effort delete — a dangling object isn't worth failing a request over. */
export async function deleteImage(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (s3Configured()) await deleteFromS3(key);
    else await deleteFromDisk(key);
  } catch {
    /* already gone, or storage unreachable */
  }
}
