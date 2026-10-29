import assert from "node:assert/strict";
import test from "node:test";
import { fixVercelRoutes } from "./fix-vercel-routes.mjs";

test("asset header route continues into the filesystem", () => {
  const fixed = fixVercelRoutes({
    routes: [
      {
        src: "/assets/(.*)",
        headers: { "cache-control": "public, max-age=31536000, immutable" },
      },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/__server" },
    ],
  });
  assert.equal(fixed.routes[0].continue, true);
  assert.equal(fixed.routes[1].handle, "filesystem");
  assert.equal(fixed.routes[2].src, "/assets/(.*)");
  assert.equal(fixed.routes[2].status, 404);
  assert.equal(fixed.routes[2].dest, "/asset-missing.txt");
  assert.equal(fixed.routes.at(-1).dest, "/__server");
});

test("does not insert the asset guard twice", () => {
  const once = fixVercelRoutes({
    routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/__server" }],
  });
  const twice = fixVercelRoutes(once);
  const guards = twice.routes.filter((route) => route.dest === "/asset-missing.txt");
  assert.equal(guards.length, 2);
});
