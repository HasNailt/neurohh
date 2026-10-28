/** Public site origin. Google must return here, not to the Grok broker. */
export const SITE_ORIGIN = "https://neurohh.ru";

/** Where to send the browser after a successful sign-in. */
export function siteCallbackURL(path = "/"): string {
  const safe = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return safe;
  const host = window.location.hostname;
  if (host === "neurohh.ru" || host === "www.neurohh.ru" || host.endsWith(".vercel.app")) {
    return `${SITE_ORIGIN}${safe}`;
  }
  return safe;
}
