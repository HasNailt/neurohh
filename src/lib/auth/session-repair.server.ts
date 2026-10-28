import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { setRequestCookie } from "better-auth/cookies";
import { serializeSignedCookie } from "better-call";

/**
 * Session cookies are signed. If the signature does not verify — a slash or
 * plus in the signature got mangled, or the signing secret changed between
 * deploys — Better Auth ignores the cookie and the UI looks signed out even
 * though the session row is still in the database.
 *
 * The raw session token is the credential. When the signature fails, look the
 * token up and re-sign it for this request so a refresh or a tab switch stays
 * logged in. A bearer token from email sign-in (no cookie at all, which is
 * what the embedded preview does) is accepted the same way.
 */
const TOKEN_RE = /^[A-Za-z0-9]{20,128}$/;

function bearerToken(header: string | null): string | null {
  if (!header) return null;
  if (header.slice(0, 7).toLowerCase() !== "bearer ") return null;
  const token = header.slice(7).trim();
  // Already-signed values contain a dot; the stock bearer plugin handles those.
  if (!token || token.includes(".")) return null;
  return TOKEN_RE.test(token) ? token : null;
}

function tokenFromCookie(value: string | null): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  const token = (dot > 0 ? value.slice(0, dot) : value).trim();
  return TOKEN_RE.test(token) ? token : null;
}

function cookieValue(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const raw = trimmed.slice(name.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function repairSessionCookie() {
  return {
    id: "session-repair",
    hooks: {
      before: [
        {
          matcher: (ctx: { path?: string }) => ctx.path === "/get-session",
          handler: createAuthMiddleware(async (ctx) => {
            const name = ctx.context.authCookies.sessionToken.name;
            const secret = ctx.context.secret;
            const verified = await ctx.getSignedCookie(name, secret).catch(() => null);
            if (verified) return;

            // `request.headers` is the real incoming request. `ctx.headers`
            // can be an empty bag and would hide the cookie and the bearer.
            const inbound = ctx.request?.headers ?? ctx.headers;
            if (!inbound) return;

            const fromHeader = inbound.get("cookie");
            const candidates = [
              bearerToken(inbound.get("authorization")),
              tokenFromCookie(fromHeader ? cookieValue(fromHeader, name) : null),
              tokenFromCookie(await ctx.getCookie(name)),
            ].filter((token): token is string => Boolean(token));
            const seen = new Set<string>();

            for (const token of candidates) {
              if (seen.has(token)) continue;
              seen.add(token);
              const found = await ctx.context.internalAdapter.findSession(token).catch(() => null);
              const expiresAt = found?.session?.expiresAt;
              if (!found?.session || !expiresAt) continue;
              if (new Date(expiresAt).getTime() <= Date.now()) continue;

              let signed: string;
              try {
                signed = await serializeSignedCookie(name, token, secret, {
                  path: "/",
                  httpOnly: true,
                  secure: true,
                  sameSite: "lax",
                });
              } catch {
                return;
              }
              const pair = signed.split(";")[0] ?? "";
              const encoded = pair.startsWith(`${name}=`) ? pair.slice(name.length + 1) : "";
              // signCookieValue already percent-encodes. setRequestCookie
              // encodes again, so pass the decoded token.signature.
              let value = encoded;
              try {
                value = decodeURIComponent(encoded);
              } catch {
                value = encoded;
              }
              if (!value) return;

              const headers = new Headers(inbound);
              setRequestCookie(headers, name, value);
              return { context: { headers } };
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
