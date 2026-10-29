import type { Sql } from "@/lib/db";
import { jpegThumb } from "@/lib/preview-thumb.server";

type PreviewMeta = {
  kind: string;
  mime: string;
  size_bytes: number;
  card_b64: string | null;
  view_b64: string | null;
  width: number | null;
  height: number | null;
  status: string;
};

function dataUrl(mime: string, b64: string | null, limit = 520_000): string | null {
  if (!b64 || b64.length < 32 || b64.length > limit) return null;
  return `data:${mime};base64,${b64}`;
}

function normalizeMime(mime: string): string {
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

/** Card and page copies made at upload, so the browser never pulls the original. */
export function thumbsFromOriginal(buf: Buffer, mime: string): { card: string | null; view: string | null } {
  const normalized = normalizeMime(mime);
  if (normalized !== "image/jpeg" && normalized !== "image/png") return { card: null, view: null };
  const cardBuf = jpegThumb(buf, normalized, 640);
  let view: string | null = null;
  if (normalized === "image/jpeg" && buf.length <= 380_000) view = buf.toString("base64");
  else {
    const viewBuf = jpegThumb(buf, normalized, 1100);
    if (viewBuf) view = viewBuf.toString("base64");
  }
  return { card: cardBuf ? cardBuf.toString("base64") : null, view };
}

async function readOriginal(sql: Sql, id: string): Promise<string | null> {
  const rows = await Promise.race([
    sql<{ data_b64: string }>`
      select data_b64 from media
      where id = ${id} and kind = 'preview' and size_bytes <= 4200000
    `,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("preview read timed out")), 8000);
    }),
  ]);
  const value = rows[0]?.data_b64;
  return value && value.length > 32 ? value : null;
}

/** Data URL for a preview. Builds a small JPEG once and stores it. */
export async function resolvePreview(sql: Sql, id: string, variant: "card" | "view"): Promise<string | null> {
  const rows = await sql<PreviewMeta>`
    select m.kind, m.mime, m.size_bytes, m.card_b64, m.view_b64, m.width, m.height, l.status
    from media m
    join listings l on l.id = m.listing_id
    where m.id = ${id}
  `;
  const row = rows[0];
  if (!row || row.kind !== "preview" || row.status === "removed") return null;
  const ready =
    variant === "view"
      ? dataUrl("image/jpeg", row.view_b64) || dataUrl("image/jpeg", row.card_b64)
      : dataUrl("image/jpeg", row.card_b64) || dataUrl("image/jpeg", row.view_b64);
  if (ready) return ready;

  const mime = normalizeMime(row.mime);
  const pixels = Math.max(0, Number(row.width) || 0) * Math.max(0, Number(row.height) || 0);
  const decodable = mime === "image/jpeg" || mime === "image/png";
  const safe = decodable && row.size_bytes > 32 && row.size_bytes <= 4_200_000 && (pixels === 0 || pixels <= 17_000_000);
  let raw: string | null = null;
  try {
    raw = await readOriginal(sql, id);
  } catch (err) {
    console.error("[image] read", err instanceof Error ? err.message : err);
    return null;
  }
  if (!raw) return null;
  if (!safe) {
    if ((mime === "image/gif" || mime === "image/webp" || mime === "image/jpeg") && row.size_bytes <= 380_000) {
      return dataUrl(mime, raw, 520_000);
    }
    return null;
  }
  const thumb = jpegThumb(Buffer.from(raw, "base64"), mime, variant === "view" ? 1100 : 640);
  if (!thumb) {
    if (mime === "image/jpeg" && raw.length < 520_000) return dataUrl(mime, raw);
    return null;
  }
  const saved = thumb.toString("base64");
  if (variant === "view") {
    await sql`
      update media
      set view_b64 = coalesce(view_b64, ${saved}),
          card_b64 = coalesce(card_b64, ${saved})
      where id = ${id}
    `;
  } else {
    await sql`update media set card_b64 = coalesce(card_b64, ${saved}) where id = ${id}`;
  }
  return `data:image/jpeg;base64,${saved}`;
}
