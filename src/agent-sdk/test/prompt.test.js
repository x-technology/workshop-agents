import { test } from "node:test";
import assert from "node:assert/strict";

import { resolvePrompt, DEFAULT_PROMPT } from "../lib/prompt.js";

test("uses the provided prompt argument", () => {
  assert.equal(resolvePrompt("do the thing"), "do the thing");
});

test("trims surrounding whitespace", () => {
  assert.equal(resolvePrompt("  hello  "), "hello");
});

test("falls back to the default when no argument is given", () => {
  assert.equal(resolvePrompt(undefined), DEFAULT_PROMPT);
});

test("falls back to the default for an empty / whitespace-only argument", () => {
  assert.equal(resolvePrompt(""), DEFAULT_PROMPT);
  assert.equal(resolvePrompt("   "), DEFAULT_PROMPT);
});
