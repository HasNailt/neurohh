#!/usr/bin/env node
/**
 * TanStack Start + Nitro (preset vercel) must emit the Build Output API.
 * Vercel 404s with "no functions, static, or services directory" when this
 * tree is missing or the project points at a static folder instead.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { applyVercelRouteFix } from "./fix-vercel-routes.mjs";

const root = join(process.cwd(), ".vercel", "output");
const functionsDir = join(root, "functions");
const staticDir = join(root, "static");
const config = join(root, "config.json");

function fail(message) {
  console.error(`[vercel-output] ${message}`);
  process.exit(1);
}

if (!existsSync(config)) fail(`missing ${config}`);
if (!existsSync(functionsDir) || !statSync(functionsDir).isDirectory()) {
  fail(`missing ${functionsDir}`);
}
if (!existsSync(staticDir) || !statSync(staticDir).isDirectory()) {
  fail(`missing ${staticDir}`);
}

const funcs = readdirSync(functionsDir);
if (!funcs.some((name) => name.endsWith(".func"))) {
  fail(`no serverless function under ${functionsDir} (found: ${funcs.join(", ") || "empty"})`);
}
const staticEntries = readdirSync(staticDir);
if (staticEntries.length === 0) fail(`${staticDir} is empty`);

const fixed = applyVercelRouteFix(root);
const assetHeader = fixed.routes.find(
  (route) => route.src === "/assets/(.*)" && route.headers && !route.dest,
);
if (!assetHeader?.continue) fail("asset cache header route does not continue to the filesystem");
const assetMiss = fixed.routes.find(
  (route) => route.src === "/assets/(.*)" && route.status === 404,
);
if (!assetMiss) fail("missing plain 404 for absent /assets files");
const filesystemAt = fixed.routes.findIndex((route) => route.handle === "filesystem");
const missAt = fixed.routes.indexOf(assetMiss);
const serverAt = fixed.routes.findIndex((route) => route.dest === "/__server");
if (!(filesystemAt < missAt && missAt < serverAt)) {
  fail("asset 404 must sit after the filesystem handler and before the server");
}
if (!existsSync(join(staticDir, "asset-missing.txt"))) fail("missing static/asset-missing.txt");

const configText = readFileSync(config, "utf8");
if (configText.includes("grok-app-builder/extensions.js")) {
  fail("vercel output still references extensions.js");
}

console.log(
  `[vercel-output] ok — functions: ${funcs.join(", ")}; static entries: ${staticEntries.length}`,
);
