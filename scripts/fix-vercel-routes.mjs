/**
 * Nitro's Vite plugin adds a header-only route for /assets/** without
 * `continue: true`. On Vercel that route is terminal: the file is never read
 * from static/, the request falls through to the server function, and CSS/JS
 * come back as an HTML "Not Found" page.
 *
 * This restores filesystem serving and answers missing hashed files with a
 * plain 404 so a new deploy cannot turn /assets into the app shell.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const MISSING = "Not Found\n";

export function fixVercelRoutes(config) {
  const routes = Array.isArray(config?.routes) ? config.routes.map((route) => ({ ...route })) : [];
  for (const route of routes) {
    if (route?.src && route.headers && !route.dest && !route.handle && route.continue !== true) {
      route.continue = true;
    }
  }
  const filesystem = routes.findIndex((route) => route.handle === "filesystem");
  const guards = [
    {
      src: "/assets/(.*)",
      status: 404,
      dest: "/asset-missing.txt",
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
    {
      src: "/__grok/(.*)",
      status: 404,
      dest: "/asset-missing.txt",
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  ];
  const key = (route) => `${route.src}|${route.status}|${route.dest}`;
  const seen = new Set(routes.map(key));
  const insertAt = filesystem >= 0 ? filesystem + 1 : routes.length;
  const fresh = guards.filter((route) => !seen.has(key(route)));
  routes.splice(insertAt, 0, ...fresh);
  return { ...config, routes };
}

export function applyVercelRouteFix(root = join(process.cwd(), ".vercel", "output")) {
  const configPath = join(root, "config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const fixed = fixVercelRoutes(config);
  writeFileSync(configPath, JSON.stringify(fixed, null, 2) + "\n");
  const file = join(root, "static", "asset-missing.txt");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, MISSING);
  return fixed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyVercelRouteFix();
}
