import { createFileRoute } from "@tanstack/react-router";

const KINDS = new Set(["avatar", "banner", "background", "side_left", "side_right", "middle"]);

export const Route = createFileRoute("/api/profile-image/$handle")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const kind = new URL(request.url).searchParams.get("kind") ?? "";
        if (!KINDS.has(kind)) return new Response("bad", { status: 400 });
        const handle = params.handle.trim().toLocaleLowerCase("ru");
        try {
          const { getSql } = await import("@/lib/db");
          const { asBody, imageResponse } = await import("@/lib/image-response");
          const sql = await getSql();
          const rows = await sql<{ mime: string; data_b64: string }>`
            select i.mime, i.data_b64
            from profile_images i
            join profiles p on p.user_id = i.user_id
            where p.handle = ${handle} and i.kind = ${kind}
          `;
          const row = rows[0];
          if (!row?.data_b64) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
          const mime = row.mime.startsWith("image/") ? row.mime : "image/jpeg";
          return imageResponse(asBody(Buffer.from(row.data_b64, "base64")), mime, 600);
        } catch (err) {
          console.error("[profile-image] read failed:", err instanceof Error ? err.message : err);
          return new Response("unavailable", {
            status: 503,
            headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
          });
        }
      },
    },
  },
});
