import { createFileRoute } from "@tanstack/react-router";
import { UUID_RE, asRole, isStaff } from "@/lib/market/shared";

/** Original chat picture. Participants and staff only. No recompression. */
export const Route = createFileRoute("/api/chat-image/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!UUID_RE.test(params.id)) return new Response("bad", { status: 400 });
        try {
          const { auth } = await import("@/lib/auth/server");
          const session = await auth.api.getSession({ headers: request.headers });
          const userId = session?.user?.id;
          if (!userId) return new Response("unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          const rows = await sql<{
            filename: string;
            mime: string;
            data_b64: string;
            seller_id: string | null;
            buyer_id: string | null;
            low_id: string | null;
            high_id: string | null;
          }>`
            select i.filename, i.mime, i.data_b64, d.seller_id, d.buyer_id, null::text as low_id, null::text as high_id
            from message_images i
            join messages m on m.id = i.message_id
            join deals d on d.id = m.deal_id
            where i.id = ${params.id}
            union all
            select i.filename, i.mime, i.data_b64, null::text, null::text, t.low_id, t.high_id
            from dm_message_images i
            join dm_messages m on m.id = i.message_id
            join dm_threads t on t.id = m.thread_id
            where i.id = ${params.id}
          `;
          const row = rows[0];
          if (!row?.data_b64) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
          let allowed =
            row.seller_id === userId ||
            row.buyer_id === userId ||
            row.low_id === userId ||
            row.high_id === userId;
          if (!allowed) {
            const role = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
            allowed = isStaff(asRole(role[0]?.role));
          }
          if (!allowed) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
          if (row.data_b64.length > 6_000_000) {
            return new Response("too large", { status: 413, headers: { "cache-control": "no-store" } });
          }
          const bytes = Buffer.from(row.data_b64, "base64");
          const body = new Uint8Array(bytes.byteLength);
          body.set(bytes);
          const download = new URL(request.url).searchParams.get("download") === "1";
          const ascii = row.filename.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "image";
          const disposition = download
            ? `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(row.filename)}`
            : "inline";
          return new Response(body.buffer, {
            status: 200,
            headers: {
              "content-type": row.mime.startsWith("image/") ? row.mime : "application/octet-stream",
              "content-length": String(body.byteLength),
              "content-disposition": disposition,
              "x-content-type-options": "nosniff",
              "cache-control": "private, max-age=3600",
            },
          });
        } catch (err) {
          console.error("[chat-image]", err instanceof Error ? err.message : err);
          return new Response("unavailable", {
            status: 503,
            headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
          });
        }
      },
    },
  },
});
