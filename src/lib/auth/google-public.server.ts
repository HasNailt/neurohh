/**
 * Direct Google sign-in for neurohh.ru.
 *
 * Uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on this app. The redirect URI
 * Google must allow is exactly:
 * https://neurohh.ru/api/auth/callback/google
 * After success Better Auth sends the browser to https://neurohh.ru/.
 */
import { SITE_ORIGIN } from "../site";
import { auth } from "./server";

const GOOGLE_REDIRECT = `${SITE_ORIGIN}/api/auth/callback/google`;

function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (forwarded || request.headers.get("host") || url.host).toLowerCase();
  const protoHeader = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = protoHeader || (host.endsWith(".grok-sandbox.com") || host === "localhost" || host.startsWith("127.") ? "http" : "https");
  const hostname = host.split(":")[0] ?? host;
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return `${local ? "http" : proto}://${host}`;
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function html(message: string): Response {
  const body = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#131211;color:#f4efe8;font:16px/1.5 Georgia,serif"><main style="max-width:28rem;padding:1.5rem"><h1 style="font-weight:500;font-size:1.6rem">Google не пустил обратно</h1><p>${message}</p><p>Нужный redirect URI: ${GOOGLE_REDIRECT}</p><p><a style="color:#f4efe8" href="${SITE_ORIGIN}/login">Вернуться ко входу</a></p></main>`;
  return new Response(body, { status: 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function startPublicGoogle(request: Request): Promise<Response> {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    return html("На сервере нет GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET.");
  }
  const host = hostOf(requestOrigin(request));
  if (host !== "neurohh.ru" && host !== "localhost" && host !== "127.0.0.1") {
    return Response.redirect(`${SITE_ORIGIN}/api/auth/google`, 302);
  }
  const origin = host === "neurohh.ru" ? SITE_ORIGIN : requestOrigin(request);
  const start = new Request(`${origin}/api/auth/sign-in/social`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: request.headers.get("cookie") ?? "",
      "x-forwarded-host": host,
      "x-forwarded-proto": origin.startsWith("http://") ? "http" : "https",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL: host === "neurohh.ru" ? `${SITE_ORIGIN}/` : "/",
      errorCallbackURL: host === "neurohh.ru" ? `${SITE_ORIGIN}/login` : "/login",
    }),
  });
  const res = await auth.handler(start);
  if (res.status >= 300 && res.status < 400) return res;
  const data = (await res.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof data?.url === "string" ? data.url : "";
  if (!url.startsWith("https://accounts.google.com/")) {
    return html("Не удалось начать вход через Google.");
  }
  const headers = new Headers({ location: url, "cache-control": "no-store" });
  for (const cookie of res.headers.getSetCookie()) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}