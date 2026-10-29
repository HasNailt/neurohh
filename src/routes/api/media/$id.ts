import { createFileRoute } from "@tanstack/react-router";
import { UUID_RE } from "@/lib/market/shared";

const INLINE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function unavailable() {
  return new Response("unavailable", {
    status: 503,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!UUID_RE.test(params.id)) return new Response("bad", { status: 400 });
        const variant = new URL(request.url).searchParams.get("s") === "view" ? "view" : "card";
        try {
          const { getSql } = await import("@/lib/db");
          const { asBody, imageResponse, previewVariant } = await import("@/lib/image-variants.server");
          const sql = await getSql();
          const rows = await sql<{
            kind: string;
            mime: string;
            filename: string;
            card_b64: string | null;
            view_b64: string | null;
            listing_id: string;
            status: string;
            seller_id: string;
          }>`
            select m.kind, m.mime, m.filename, m.card_b64, m.view_b64, m.listing_id, l.status, l.seller_id
            from media m
            join listings l on l.id = m.listing_id
            where m.id = ${params.id}
          `;
          const row = rows[0];
          if (!row) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });

          if (row.kind === "preview") {
            if (row.status === "removed") {
              const { getSessionUser } = await import("@/lib/auth/verify.server");
              const user = await getSessionUser();
              if (!user || user.id !== row.seller_id) {
                return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
              }
            }
            const cache = row.status === "removed" ? "private" : "public";
            const cached = variant === "card" ? row.card_b64 : row.view_b64;
            if (cached) return imageResponse(asBody(Buffer.from(cached, "base64")), "image/webp", cache);
            const bytes = await previewVariant(sql, params.id, variant);
            if (!bytes) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
            return imageResponse(asBody(bytes), "image/webp", cache);
          }

          const { getSessionUser } = await import("@/lib/auth/verify.server");
          const user = await getSessionUser();
          if (!user) return new Response("unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
          if (user.id !== row.seller_id) {
            const deal = await sql<{ status: string; buyer_id: string }>`
              select status, buyer_id from deals where listing_id = ${row.listing_id}
            `;
            const released =
              deal[0] &&
              deal[0].buyer_id === user.id &&
              (deal[0].status === "files_released" ||
                deal[0].status === "completed" ||
                deal[0].status === "confirmed");
            if (!released) return new Response("forbidden", { status: 403, headers: { "cache-control": "no-store" } });
          }
          const file = await sql<{ data_b64: string }>`
            select data_b64 from media where id = ${params.id}
          `;
          if (!file[0]) return new Response("not found", { status: 404 });
          const bytes = asBody(Buffer.from(file[0].data_b64, "base64"));
          const inline = INLINE.has(row.mime);
          const safe = row.filename.replace(/["\r\n]/g, "");
          return new Response(bytes, {
            status: 200,
            headers: {
              "content-type": inline ? row.mime : "application/octet-stream",
              "content-length": String(bytes.byteLength),
              "x-content-type-options": "nosniff",
              "cache-control": "private, no-store",
              "content-disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(safe)}"; filename*=UTF-8''${encodeURIComponent(safe)}`,
            },
          });
        } catch (err) {
          console.error("[media] read failed:", err instanceof Error ? err.message : err);
          return unavailable();
        }
      },
    },
  },
});
