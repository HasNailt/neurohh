import { createFileRoute } from "@tanstack/react-router";
import { maybeRewriteHandoff, redeemHandoff, startPublicGoogle } from "@/lib/auth/google-public.server";
import { auth } from "@/lib/auth/server";

async function handle(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/auth/google") return startPublicGoogle(request);
  if (path === "/api/auth/handoff") return redeemHandoff(request);
  const response = await auth.handler(request);
  if (request.method === "GET" && path.includes("/oauth2/callback/")) {
    return maybeRewriteHandoff(request, response);
  }
  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
