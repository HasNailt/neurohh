import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { startPublicGoogle } from "@/lib/auth/google-public.server";

function socialDisabled(): Response {
  return new Response("Вход через соцсети отключён. Используйте email и пароль на сайте.", {
    status: 410,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function handle(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/auth/google") return startPublicGoogle(request);
  if (path === "/api/auth/callback/google") return auth.handler(request);
  if (path === "/api/auth/sign-in/social") {
    let provider = "";
    try {
      const body = (await request.clone().json()) as { provider?: unknown };
      provider = typeof body.provider === "string" ? body.provider : "";
    } catch {
      provider = "";
    }
    if (provider !== "google") return socialDisabled();
    return auth.handler(request);
  }
  if (
    path === "/api/auth/handoff" ||
    path.includes("/oauth2/") ||
    path.includes("/sign-in/telegram") ||
    path.includes("/callback/vk") ||
    path.includes("/sign-in/social") ||
    path.includes("/callback/")
  ) {
    return socialDisabled();
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
