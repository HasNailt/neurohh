/**
 * Google sign-in for the public site.
 *
 * auth.grok.me matches redirect_uri exactly. The sandbox client only allows
 * `*.grok-sandbox.com`. A per-app client may allow neurohh.ru, the Vercel
 * alias, or both. The state cookie is host-only, so the flow must start on a
 * host the broker accepts. If that host is not neurohh.ru, the callback copies
 * the session onto https://neurohh.ru.
 */
import { randomBytes } from "node:crypto";
import { getSql } from "../db";
import { SITE_ORIGIN } from "../site";
import { auth, grokOAuthClientId, SESSION_TOKEN_COOKIE } from "./server";
import { PREVIEW_CLIENT_ID } from "./preview";

const CALLBACK_PATH = "/api/auth/oauth2/callback/grok-google";
const BROKER_AUTHORIZE = "https://auth.grok.me/api/auth/oauth2/authorize";

type Cache = { at: number; clientId: string; uris: string[] };
const globalCache = globalThis as typeof globalThis & { __neurohhGoogleRedirects?: Cache };

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

function callbackFor(origin: string): string {
  return `${origin.replace(/\/$/, "")}${CALLBACK_PATH}`;
}

function candidateRedirects(requestOriginValue: string): string[] {
  const list = [
    callbackFor(SITE_ORIGIN),
    callbackFor(requestOriginValue),
    callbackFor("https://neurohh.vercel.app"),
  ];
  for (const key of ["BETTER_AUTH_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"]) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    try {
      const origin = raw.startsWith("http") ? new URL(raw).origin : `https://${raw}`;
      list.push(callbackFor(origin));
    } catch {
      /* ignore */
    }
  }
  return [...new Set(list)];
}

async function brokerAccepts(clientId: string, redirectUri: string): Promise<boolean> {
  const url = new URL(BROKER_AUTHORIZE);
  url.searchParams.set("prompt", "none");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("redirect_uri", redirectUri);
  const res = await fetch(url, { redirect: "manual" });
  return res.status >= 300 && res.status < 400;
}

async function acceptedRedirects(clientId: string, requestOriginValue: string): Promise<string[] | null> {
  const now = Date.now();
  const cached = globalCache.__neurohhGoogleRedirects;
  if (cached && cached.clientId === clientId && now - cached.at < 5 * 60_000) return cached.uris;
  const uris: string[] = [];
  let attempts = 0;
  let failures = 0;
  for (const uri of candidateRedirects(requestOriginValue)) {
    attempts += 1;
    try {
      if (await brokerAccepts(clientId, uri)) uris.push(uri);
    } catch {
      failures += 1;
    }
  }
  if (attempts > 0 && failures === attempts) return null;
  globalCache.__neurohhGoogleRedirects = { at: now, clientId, uris };
  return uris;
}

function prefer(uris: string[]): string | null {
  const neuro = uris.find((uri) => hostOf(uri) === "neurohh.ru");
  return neuro ?? uris[0] ?? null;
}

function html(message: string): Response {
  const body = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#131211;color:#f4efe8;font:16px/1.5 Georgia,serif"><main style="max-width:28rem;padding:1.5rem"><h1 style="font-weight:500;font-size:1.6rem">Google не пустил обратно</h1><p>${message}</p><p><a style="color:#f4efe8" href="${SITE_ORIGIN}/login">Вернуться ко входу</a></p></main>`;
  return new Response(body, { status: 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function startPublicGoogle(request: Request): Promise<Response> {
  const origin = requestOrigin(request);
  const host = hostOf(origin);
  const clientId = grokOAuthClientId();
  if (clientId === PREVIEW_CLIENT_ID && host.endsWith(".grok-sandbox.com")) {
    return beginOAuth(request, `${origin}/`);
  }
  const accepted = await acceptedRedirects(clientId, origin);
  if (accepted === null) {
    const callbackURL = host === "neurohh.ru" ? `${SITE_ORIGIN}/` : "/";
    return beginOAuth(request, callbackURL);
  }
  const chosen = prefer(accepted);
  if (!chosen) {
    return html(
      "Адрес возврата https://neurohh.ru ещё не зарегистрирован в сервисе входа, поэтому Google останавливается с ошибкой. Войдите по email или попробуйте Google чуть позже.",
    );
  }
  const chosenOrigin = new URL(chosen).origin;
  if (chosenOrigin !== origin) {
    return new Response(null, {
      status: 302,
      headers: { location: `${chosenOrigin}/api/auth/google`, "cache-control": "no-store" },
    });
  }
  const callbackURL = host === "neurohh.ru" ? `${SITE_ORIGIN}/` : "/";
  return beginOAuth(request, callbackURL);
}

async function beginOAuth(request: Request, callbackURL: string): Promise<Response> {
  const headers = new Headers(request.headers);
  if (!headers.has("origin")) headers.set("origin", requestOrigin(request));
  const apiRes = await auth.api.signInWithOAuth2({
    body: {
      providerId: "grok-google",
      callbackURL,
      errorCallbackURL: `${SITE_ORIGIN}/login`,
    },
    headers,
    asResponse: true,
  });
  if (!apiRes.ok) {
    return html("Не получилось начать вход через Google. Попробуйте ещё раз.");
  }
  const body = (await apiRes.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url) return html("Не получилось начать вход через Google. Попробуйте ещё раз.");
  const out = new Headers({ location: body.url, "cache-control": "no-store" });
  for (const cookie of apiRes.headers.getSetCookie()) out.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers: out });
}

function needsHandoff(host: string): boolean {
  return host.endsWith(".vercel.app");
}

export async function maybeRewriteHandoff(request: Request, response: Response): Promise<Response> {
  const host = hostOf(requestOrigin(request));
  if (!needsHandoff(host) || response.status < 300 || response.status >= 400) return response;
  const cookies = response.headers.getSetCookie().filter((line) => line.startsWith(`${SESSION_TOKEN_COOKIE}=`));
  if (cookies.length === 0) return response;
  const code = randomBytes(24).toString("base64url");
  try {
    const sql = await getSql();
    const expires = new Date(Date.now() + 2 * 60_000).toISOString();
    await sql`delete from auth_handoff where expires_at < now()`;
    await sql`insert into auth_handoff (code, cookie_headers, expires_at) values (${code}, ${JSON.stringify(cookies)}, ${expires})`;
  } catch {
    return response;
  }
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    headers.append(key, value);
  });
  for (const cookie of response.headers.getSetCookie()) headers.append("set-cookie", cookie);
  headers.set("location", `${SITE_ORIGIN}/api/auth/handoff?code=${encodeURIComponent(code)}`);
  headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

export async function redeemHandoff(request: Request): Promise<Response> {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return Response.redirect(`${SITE_ORIGIN}/login`, 302);
  try {
    const sql = await getSql();
    const rows = await sql<{ cookie_headers: string }>`
      delete from auth_handoff
      where code = ${code} and expires_at > now()
      returning cookie_headers
    `;
    const raw = rows[0]?.cookie_headers;
    if (!raw) return Response.redirect(`${SITE_ORIGIN}/login`, 302);
    const cookies = JSON.parse(raw) as unknown;
    if (!Array.isArray(cookies)) return Response.redirect(`${SITE_ORIGIN}/login`, 302);
    const headers = new Headers({ location: `${SITE_ORIGIN}/`, "cache-control": "no-store" });
    for (const line of cookies) {
      if (typeof line === "string" && line.startsWith(`${SESSION_TOKEN_COOKIE}=`)) {
        headers.append("set-cookie", line);
      }
    }
    return new Response(null, { status: 302, headers });
  } catch {
    return Response.redirect(`${SITE_ORIGIN}/login`, 302);
  }
}
