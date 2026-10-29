import { createFileRoute } from "@tanstack/react-router";
import { UUID_RE } from "@/lib/market/shared";
import { asBody, imageResponse } from "@/lib/image-response";

/** Only a stored thumbnail. Never the original file — that response was closing the connection. */
export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!UUID_RE.test(params.id)) return new Response("bad", { status: 400 });
        const variant = new URL(request.url).searchParams.get("s") === "view" ? "view" : "card";
        try {
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          const rows = await sql<{ card_b64: string | null; view_b64: string | null; status: string }>`
            select m.card_b64, m.view_b64, l.status
            from media m
            join listings l on l.id = m.listing_id
            where m.id = ${params.id} and m.kind = 'preview'
          `;
          const row = rows[0];
          if (!row || row.status === "removed") {
            return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
          }
          const b64 = variant === "view" ? row.view_b64 || row.card_b64 : row.card_b64 || row.view_b64;
          if (!b64 || b64.length < 32 || b64.length > 400_000) {
            return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
          }
          return imageResponse(asBody(Buffer.from(b64, "base64")), "image/jpeg", 86400);
        } catch (err) {
          console.error("[media] read failed:", err instanceof Error ? err.message : err);
          return new Response("unavailable", {
            status: 503,
            headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
          });
        }
      },
    },
  },
});
