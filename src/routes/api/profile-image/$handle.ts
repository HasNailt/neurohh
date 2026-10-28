import { createFileRoute } from "@tanstack/react-router";

const KINDS = new Set(["avatar", "banner", "background"]);

export const Route = createFileRoute("/api/profile-image/$handle")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const kind = new URL(request.url).searchParams.get("kind") ?? "";
        if (!KINDS.has(kind)) return new Response("bad", { status: 400 });
        const handle = params.handle.trim().toLocaleLowerCase("ru");
        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        const rows = await sql<{ mime: string; data_b64: string }>`
          select i.mime, i.data_b64
          from profile_images i
          join profiles p on p.user_id = i.user_id
          where p.handle = ${handle} and i.kind = ${kind}
        `;
        const row = rows[0];
        if (!row) return new Response("not found", { status: 404 });
        const bytes = Buffer.from(row.data_b64, "base64");
        return new Response(bytes, {
          headers: {
            "content-type": row.mime,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
