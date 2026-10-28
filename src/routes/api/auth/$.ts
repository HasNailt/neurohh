import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

function socialDisabled(): Response {
  return new Response("Вход через соцсети отключён. Используйте email и пароль на сайте.", {
    status: 410,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function handle(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (
    path === "/api/auth/google" ||
    path === "/api/auth/handoff" ||
    path.includes("/oauth2/") ||
    path.includes("/sign-in/social") ||
    path.includes("/sign-in/telegram") ||
    path.includes("/callback/vk")
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
