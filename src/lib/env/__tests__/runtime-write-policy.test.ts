import { test } from "node:test";
import assert from "node:assert/strict";
import { canWriteRuntimeData } from "@/lib/env/runtime-write-policy";

test("Vercel production may persist runtime data", () => {
  assert.equal(canWriteRuntimeData({ VERCEL_ENV: "production" }), true);
});

test("Vercel preview and development are read-only", () => {
  assert.equal(canWriteRuntimeData({ VERCEL_ENV: "preview" }), false);
  assert.equal(canWriteRuntimeData({ VERCEL_ENV: "development" }), false);
  assert.equal(canWriteRuntimeData({ VERCEL_ENV: "unexpected" }), false);
});

test("non-Vercel/local workflows preserve existing write behavior", () => {
  assert.equal(canWriteRuntimeData({}), true);
});
