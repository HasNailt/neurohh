import assert from "node:assert/strict";
import test from "node:test";
import { isTransientDbError } from "./pg-pool.mjs";

test("idle pooler failures are retried", () => {
  assert.equal(isTransientDbError(Object.assign(new Error("read ETIMEDOUT"), { code: "ETIMEDOUT" })), true);
  assert.equal(isTransientDbError(new Error("timeout exceeded when trying to connect")), true);
  assert.equal(isTransientDbError(new Error("Query read timeout")), true);
  assert.equal(isTransientDbError(new Error("Connection terminated unexpectedly")), true);
  assert.equal(isTransientDbError(Object.assign(new Error("reset"), { code: "ECONNRESET" })), true);
});

test("sql errors are not retried", () => {
  assert.equal(isTransientDbError(Object.assign(new Error("duplicate key"), { code: "23505" })), false);
  assert.equal(isTransientDbError(new Error("syntax error at or near")), false);
});
