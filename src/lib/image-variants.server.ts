import sharp from "sharp";
import type { Sql } from "@/lib/db";

const CARD_EDGE = 720;
const VIEW_EDGE = 1440;

type Pair = { card: Buffer; view: Buffer };

const globalRef = globalThis as typeof globalThis & {
  __imageVariantInflight__?: Map<string, Promise<Pair | null>>;
  __imageVariantActive__?: number;
  __imageVariantWaiters__?: Array<() => void>;
};

function inflightMap() {
  globalRef.__imageVariantInflight__ ??= new Map();
  return globalRef.__imageVariantInflight__;
}

function gate<T>(fn: () => Promise<T>): Promise<T> {
  const waiters = (globalRef.__imageVariantWaiters__ ??= []);
  const acquire = async () => {
    if ((globalRef.__imageVariantActive__ ?? 0) >= 2) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
    globalRef.__imageVariantActive__ = (globalRef.__imageVariantActive__ ?? 0) + 1;
  };
  return acquire().then(async () => {
    try {
      return await fn();
    } finally {
      globalRef.__imageVariantActive__ = Math.max(0, (globalRef.__imageVariantActive__ ?? 1) - 1);
      waiters.shift()?.();
    }
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("image timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Display copy: WebP, capped edge, alpha kept. Never the original multi‑MB upload. */
export async function webpFit(input: Buffer, edge: number, quality: number): Promise<Buffer> {
  return withTimeout(
    sharp(input, { animated: false, limitInputPixels: 20_000_000, failOn: "none" })
      .rotate()
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .webp({ quality, alphaQuality: 80, effort: 2 })
      .toBuffer(),
    12_000,
  );
}

export async function makePreviewPair(input: Buffer): Promise<Pair> {
  const [card, view] = await Promise.all([webpFit(input, CARD_EDGE, 70), webpFit(input, VIEW_EDGE, 78)]);
  return { card, view };
}

async function readPair(sql: Sql, id: string): Promise<Pair | null> {
  const cached = await sql<{ card_b64: string | null; view_b64: string | null }>`
    select card_b64, view_b64 from media where id = ${id} and kind = 'preview'
  `;
  const hit = cached[0];
  if (hit?.card_b64 && hit.view_b64) {
    return {
      card: Buffer.from(hit.card_b64, "base64"),
      view: Buffer.from(hit.view_b64, "base64"),
    };
  }

  return gate(async () => {
    const again = await sql<{ card_b64: string | null; view_b64: string | null }>`
      select card_b64, view_b64 from media where id = ${id} and kind = 'preview'
    `;
    if (again[0]?.card_b64 && again[0].view_b64) {
      return {
        card: Buffer.from(again[0].card_b64, "base64"),
        view: Buffer.from(again[0].view_b64, "base64"),
      };
    }
    const full = await sql<{ data_b64: string }>`
      select data_b64 from media where id = ${id} and kind = 'preview'
    `;
    if (!full[0]?.data_b64) return null;
    const original = Buffer.from(full[0].data_b64, "base64");
    const pair = await makePreviewPair(original);
    await sql`
      update media
      set card_b64 = ${pair.card.toString("base64")},
          view_b64 = ${pair.view.toString("base64")}
      where id = ${id}
    `;
    return pair;
  });
}

/** Card (feed) or view (lot page). Original bytes stay in the database. */
export function previewVariant(sql: Sql, id: string, variant: "card" | "view"): Promise<Buffer | null> {
  const key = `${id}:${variant}`;
  const pending = inflightMap().get(key);
  if (pending) return pending.then((pair) => (pair ? pair[variant] : null));
  const job = readPair(sql, id);
  inflightMap().set(key, job);
  void job.finally(() => {
    if (inflightMap().get(key) === job) inflightMap().delete(key);
  });
  return job.then((pair) => (pair ? pair[variant] : null));
}

export async function storePreviewVariants(sql: Sql, id: string, original: Buffer): Promise<void> {
  try {
    const pair = await makePreviewPair(original);
    await sql`
      update media
      set card_b64 = ${pair.card.toString("base64")},
          view_b64 = ${pair.view.toString("base64")}
      where id = ${id}
    `;
  } catch (err) {
    console.error("[media] preview variant skipped:", err instanceof Error ? err.message : err);
  }
}

export function imageResponse(bytes: Uint8Array, mime: string, cache: "public" | "hour" | "private"): Response {
  const headers = new Headers({
    "content-type": mime,
    "content-length": String(bytes.byteLength),
    "x-content-type-options": "nosniff",
    "content-disposition": "inline",
  });
  if (cache === "public") {
    headers.set("cache-control", "public, max-age=31536000, s-maxage=31536000, immutable");
    headers.set("cdn-cache-control", "public, max-age=31536000, immutable");
    headers.set("vercel-cdn-cache-control", "public, s-maxage=31536000, immutable");
  } else if (cache === "hour") {
    headers.set("cache-control", "public, max-age=600, s-maxage=600");
  } else {
    headers.set("cache-control", "private, no-store");
  }
  return new Response(bytes, { status: 200, headers });
}

export function asBody(buf: Buffer): Uint8Array {
  const out = new Uint8Array(buf.byteLength);
  out.set(buf);
  return out;
}
