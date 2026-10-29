import { createFileRoute } from "@tanstack/react-router";

const KINDS = new Set(["avatar", "banner", "background"]);

function unavailable() {
  return new Response("unavailable", {
    status: 503,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/profile-image/$handle")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const kind = new URL(request.url).searchParams.get("kind") ?? "";
        if (!KINDS.has(kind)) return new Response("bad", { status: 400 });
        const handle = params.handle.trim().toLocaleLowerCase("ru");
        try {
          const { getSql } = await import("@/lib/db");
          const { asBody, imageResponse, webpFit } = await import("@/lib/image-variants.server");
          const sql = await getSql();
          const rows = await sql<{ user_id: string; mime: string; view_b64: string | null }>`
            select i.user_id, i.mime, i.view_b64
            from profile_images i
            join profiles p on p.user_id = i.user_id
            where p.handle = ${handle} and i.kind = ${kind}
          `;
          const row = rows[0];
          if (!row) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
          if (row.view_b64) {
            return imageResponse(asBody(Buffer.from(row.view_b64, "base64")), "image/webp", "hour");
          }
          const full = await sql<{ data_b64: string }>`
            select data_b64 from profile_images where user_id = ${row.user_id} and kind = ${kind}
          `;
          if (!full[0]?.data_b64) return new Response("not found", { status: 404 });
          const edge = kind === "avatar" ? 512 : 1400;
          const webp = await webpFit(Buffer.from(full[0].data_b64, "base64"), edge, kind === "avatar" ? 76 : 78);
          const b64 = webp.toString("base64");
          await sql`
            update profile_images set view_b64 = ${b64}
            where user_id = ${row.user_id} and kind = ${kind}
          `;
          return imageResponse(asBody(webp), "image/webp", "hour");
        } catch (err) {
          console.error("[profile-image] read failed:", err instanceof Error ? err.message : err);
          return unavailable();
        }
      },
    },
  },
});
