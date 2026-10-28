#!/usr/bin/env node
/**
 * TanStack Start + Nitro (preset vercel) must emit the Build Output API.
 * Vercel 404s with "no functions, static, or services directory" when this
 * tree is missing or the project points at a static folder instead.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

console.log(
  `[vercel-output] ok — functions: ${funcs.join(", ")}; static entries: ${staticEntries.length}`,
);
