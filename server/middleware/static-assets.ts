/**
 * Requests that reach this function were not served from Vercel's static
 * directory. Hashed CSS/JS must never fall through to the HTML app shell
 * ("Not Found" document). Grok's extensions.js is blocked by CSP even if an
 * edge injector puts the tag back into the page.
 */
const ASSET = /^\/(?:assets|__grok)\//;

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

interface AssetEvent {
  url: URL;
}

export default async function staticAssets(
  event: AssetEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  if (ASSET.test(event.url.pathname)) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  const result = await next();
  if (!(result instanceof Response)) return result;
  const type = result.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return result;
  const headers = new Headers(result.headers);
  headers.set("content-security-policy", CSP);
  headers.set("cache-control", "private, no-cache, must-revalidate");
  headers.delete("content-length");
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
