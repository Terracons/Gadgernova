import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Pluggable image storage.
 *
 *   S3-compatible (Cloudflare R2, Backblaze, AWS)  — set the S3_* variables
 *   Vercel Blob                                    — set BLOB_READ_WRITE_TOKEN
 *   Local disk                                     — fine on Hostinger/VPS
 *
 * Which one runs is decided by which variables are set, so the same codebase
 * deploys everywhere without edits. Priority: S3 → Vercel Blob → local disk.
 *
 * Vercel's filesystem is ephemeral: files written at runtime vanish on the next
 * deploy and aren't shared between instances. On Vercel you MUST use Vercel Blob
 * (enable it in the Storage tab — it injects BLOB_READ_WRITE_TOKEN) or an S3
 * bucket, or uploaded images will disappear.
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

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function storageBackend(): string {
  if (s3Configured()) return "Cloudflare R2 / S3";
  if (blobConfigured()) return "Vercel Blob";
  return "local disk";
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

// ── Vercel Blob ──────────────────────────────────────────────────────
// The returned public URL doubles as the delete handle (Blob deletes by URL),
// so it is stored as the image's storageKey rather than the object path.

async function saveToBlob(data: Buffer, key: string): Promise<string> {
  const { put } = await import("@vercel/blob");
  const blob = await put(key, data, {
    access: "public",
    addRandomSuffix: false, // key already carries a UUID
    contentType: CONTENT_TYPES[path.extname(key)] ?? "application/octet-stream",
    cacheControlMaxAge: 31536000, // 1 year — contents are immutable
  });
  return blob.url;
}

async function deleteFromBlob(url: string): Promise<void> {
  const { del } = await import("@vercel/blob");
  await del(url);
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

  if (s3Configured()) return { url: await saveToS3(data, key), key };
  // Blob deletes by URL, so the URL is both the image url and its storage key.
  if (blobConfigured()) {
    const url = await saveToBlob(data, key);
    return { url, key: url };
  }
  return { url: await saveToDisk(data, key), key };
}

/** Best-effort delete — a dangling object isn't worth failing a request over. */
export async function deleteImage(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (s3Configured()) await deleteFromS3(key);
    else if (blobConfigured()) await deleteFromBlob(key);
    else await deleteFromDisk(key);
  } catch {
    /* already gone, or storage unreachable */
  }
}
