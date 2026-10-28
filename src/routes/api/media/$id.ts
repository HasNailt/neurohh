import { createFileRoute } from "@tanstack/react-router";
import { UUID_RE } from "@/lib/market/shared";

const INLINE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!UUID_RE.test(params.id)) return new Response("bad", { status: 400 });
        const { getSql } = await import("@/lib/db");
        const { getSessionUser } = await import("@/lib/auth/verify.server");
        const sql = await getSql();
        const rows = await sql<{
          kind: string;
          mime: string;
          filename: string;
          data_b64: string;
          listing_id: string;
          status: string;
          seller_id: string;
        }>`
          select m.kind, m.mime, m.filename, m.data_b64, m.listing_id, l.status, l.seller_id
          from media m
          join listings l on l.id = m.listing_id
          where m.id = ${params.id}
        `;
        const row = rows[0];
        if (!row) return new Response("not found", { status: 404 });

        if (row.kind === "file") {
          const user = await getSessionUser();
          if (!user) return new Response("unauthorized", { status: 401 });
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
            if (!released) return new Response("forbidden", { status: 403 });
          }
        } else if (row.status === "removed") {
          const user = await getSessionUser();
          if (!user || user.id !== row.seller_id) return new Response("not found", { status: 404 });
        }

        const bytes = Buffer.from(row.data_b64, "base64");
        const inline = INLINE.has(row.mime);
        const safe = row.filename.replace(/["\r\n]/g, "");
        const headers = new Headers({
          "Content-Type": inline ? row.mime : "application/octet-stream",
          "Content-Length": String(bytes.length),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": row.kind === "preview" ? "public, max-age=3600" : "private, no-store",
          "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(safe)}"; filename*=UTF-8''${encodeURIComponent(safe)}`,
        });
        return new Response(bytes, { status: 200, headers });
      },
    },
  },
});
